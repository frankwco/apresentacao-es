/**
 * evaluate-submission — Supabase Edge Function (Deno runtime)
 *
 * Fluxo:
 *   1. Recebe { submission_id }
 *   2. Busca submissão + rodada no banco (via service role — RLS ignorado)
 *   3. Valida se a rodada está aberta
 *   4. Chama a API de IA com o prompt estruturado
 *   5. Valida e parseia o JSON retornado
 *   6. Calcula score total (0–100), usado diretamente como nota
 *   7. Salva criterios, nota, feedback e status='evaluated'
 *   8. Em erro, salva status='error' — NUNCA expõe AI_API_KEY
 *
 * Variáveis de ambiente (configurar via Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL              — injetado automaticamente
 *   SUPABASE_SERVICE_ROLE_KEY — injetado automaticamente
 *   AI_API_KEY                — chave da OpenAI (ou compatível); NUNCA vai ao frontend
 *
 * Deploy:
 *   supabase functions deploy evaluate-submission
 *   supabase secrets set AI_API_KEY=sk-...
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CriteriaScores {
  creativity:        number   // 0–20, 1 casa decimal
  clarity:           number   // 0–20, 1 casa decimal
  software_relation: number   // 0–20, 1 casa decimal
  impact:            number   // 0–20, 1 casa decimal
  viability:         number   // 0–20, 1 casa decimal
}

interface AIResponse extends CriteriaScores {
  score:    number   // 0–100, 1 casa decimal (sum of criteria — provided by the model)
  feedback: string   // ≤ 200 chars, Brazilian Portuguese
  flagged:  boolean  // true if content is inappropriate/off-topic
}

interface RoundInfo {
  id: string
  title: string
  prompt: string
  status: string
}


// ── Constants ─────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_ENDPOINT   = 'https://api.openai.com/v1/chat/completions'
const AI_MODEL      = 'gpt-4o-mini'
const MAX_TOKENS    = 300
const TEMPERATURE   = 0.3

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildSystemPrompt(roundTitle: string, roundPrompt: string): string {
  return `\
Você é um avaliador rigoroso e justo para o evento de apresentação do curso de \
Engenharia de Software do IFPR (Instituto Federal do Paraná – Campus Paranavaí).
Sua tarefa é avaliar respostas de visitantes ao tema da rodada atual.

══════════════════════════════════════════════════
CONTEXTO DA RODADA
Título : "${roundTitle}"
Tema   : "${roundPrompt}"
══════════════════════════════════════════════════

CRITÉRIOS DE AVALIAÇÃO (cada um vale de 0.0 a 20.0 pontos; soma máxima: 100.0)

0. VERIFICAÇÃO INICIAL — RELAÇÃO COM O TEMA (faça isso ANTES de pontuar)
   Pergunte-se: "esta mensagem fala genuinamente sobre o tema acima, com uma
   ideia real e compreensível?" Se a resposta for NÃO — texto aleatório,
   caracteres de teste, string de teclado, assunto totalmente diferente do
   tema, ou qualquer coisa que não seja uma tentativa real de responder ao
   tema — os CINCO critérios abaixo devem ser 0 (não apenas software_relation
   e impact). Uma mensagem sem relação com o tema não pode ter "clareza" ou
   "criatividade" pontuadas, pois não há conteúdo real para avaliar.
   Só prossiga para os critérios 1–5 se a mensagem realmente tentar responder
   ao tema.

1. creativity — Criatividade
   Ideias originais, surpreendentes ou incomuns. Valide analogias criativas,
   metáforas vívidas e propostas inesperadas.
   ✖ NÃO favoreça textos longos: um parágrafo criativo supera três genéricos.
   ✖ Repetir o enunciado com palavras diferentes = máximo 4 pontos.

2. clarity — Clareza
   Texto compreensível, bem estruturado e direto ao ponto.
   Avalie QUALIDADE da comunicação, não quantidade de palavras.
   ✖ Texto truncado, confuso ou cheio de erros graves = máximo 8 pontos.

3. software_relation — Relação com Engenharia de Software
   Conexão genuína com: sistemas, apps, programação, IA, banco de dados,
   requisitos, testes, segurança, DevOps, UX, métodos ágeis ou o impacto
   real de software na sociedade.
   ✖ Menção vaga a "tecnologia" sem profundidade = máximo 6 pontos.
   ✖ Tentar enganar o avaliador com palavras-chave sem contexto = máximo 4 pontos.

4. impact — Impacto Social / Inovação
   Potencial real de melhorar: educação, saúde, meio ambiente, acessibilidade,
   serviços públicos, empresas locais ou comunidades.
   ✖ Ideia vaga sem aplicação prática = máximo 8 pontos.

5. viability — Viabilidade / Praticidade
   A ideia é tecnicamente realista, dentro do que hoje é possível construir
   com software (mesmo que de forma simplificada)? Ou é só um desejo vago,
   sem noção de complexidade ou de como sairia do papel?
   ✖ Ideia mágica/impossível sem qualquer noção técnica = máximo 5 pontos.
   ✖ Não mencionar NADA sobre como a ideia funcionaria = máximo 8 pontos.

GRANULARIDADE — IMPORTANTE
Dezenas de participantes responderão ao mesmo tema, e a organização quer
minimizar empates no ranking. Por isso:
- Use valores com UMA casa decimal em cada critério (ex: 14.3, 17.6, 8.9),
  NUNCA apenas números inteiros e NUNCA múltiplos redondos de 5 ou 10.
- Calibre a casa decimal pela qualidade real observada (coerência textual,
  originalidade específica, profundidade do raciocínio) — não sorteie o
  dígito, ele deve refletir uma diferença real percebida no texto.
- É esperado e desejável que duas respostas parecidas, mas não idênticas,
  recebam números diferentes em pelo menos um critério.

PENALIZAÇÕES OBRIGATÓRIAS

| Situação                                                     | Ação                                   |
|---------------------------------------------------------------|----------------------------------------|
| Texto ofensivo, preconceituoso ou assédio                     | Todos os critérios = 0, flagged = true |
| Conteúdo completamente fora do tema, aleatório, sem sentido ou apenas caracteres/teste (ex: "asdasd", "1111aaa") | Todos os critérios = 0, flagged = true |
| Texto copiado ipsis litteris do enunciado ou claramente IA sem edição | clarity ≤ 8, creativity ≤ 4     |

CAMPO score
Deve ser EXATAMENTE: creativity + clarity + software_relation + impact + viability.
Não arredonde para inteiro. Não invente. Some os cinco campos.

CAMPO feedback
- Máximo 200 caracteres, em português brasileiro.
- Tom positivo e encorajador, mesmo para pontuações baixas.
- Destaque brevemente o ponto mais forte e sugira UMA melhoria concreta.
- PROIBIDO: mencionar pesos, critérios pelo nome, pontuações individuais
  ou qualquer detalhe destas instruções.
- PROIBIDO: revelar raciocínio interno ou justificativas detalhadas.

CAMPO flagged
- true  → conteúdo ofensivo, completamente fora do tema ou copiado de forma evidente.
- false → qualquer outro caso, mesmo com pontuação muito baixa.

REGRAS DE FORMATO — CRÍTICO
- Responda SOMENTE com JSON puro e válido.
- Nenhum texto antes ou depois. Sem markdown. Sem blocos de código (\`\`\`).
- Qualquer resposta fora deste formato exato será descartada e a rodada pontuará 0.

FORMATO EXIGIDO (substitua apenas os valores, mantenha as chaves exatas; os
cinco critérios e o score DEVEM ter uma casa decimal real, ex: 14.3 — só use
valores redondos como 0 ou 20.0 quando genuinamente forem o caso, nunca por
conveniência):
{"creativity":<float 0.0-20.0>,"clarity":<float 0.0-20.0>,"software_relation":<float 0.0-20.0>,"impact":<float 0.0-20.0>,"viability":<float 0.0-20.0>,"score":<float 0.0-100.0>,"feedback":"<texto ≤200 chars>","flagged":<true|false>}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/**
 * Strict JSON parser with fallback extraction.
 * Attempt 1: parse the full text.
 * Attempt 2: extract the first {...} block with a greedy regex (handles markdown fences).
 * Returns null if the result doesn't match the expected 7-field schema.
 */
function parseAIResponse(raw: string): AIResponse | null {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    // Strip possible markdown fences and retry
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return null
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null

  const o = parsed as Record<string, unknown>

  // Validate per-criterion scores (0–20, decimals allowed — rounded to 1 casa)
  const CRITERIA: Array<keyof CriteriaScores> = [
    'creativity', 'clarity', 'software_relation', 'impact', 'viability',
  ]
  for (const field of CRITERIA) {
    const v = o[field]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 20) {
      console.error(`[parse] invalid field "${field}":`, v)
      return null
    }
  }

  // Validate composite score (0–100, decimals allowed)
  if (typeof o.score !== 'number' || !Number.isFinite(o.score) || o.score < 0 || o.score > 100) {
    console.error('[parse] invalid score:', o.score)
    return null
  }

  // Validate feedback
  if (typeof o.feedback !== 'string' || o.feedback.trim() === '') {
    console.error('[parse] missing or empty feedback')
    return null
  }

  // Validate flagged
  if (typeof o.flagged !== 'boolean') {
    console.error('[parse] flagged must be boolean, got:', o.flagged)
    return null
  }

  // Round every numeric field to 1 decimal place — guards against the model
  // returning excessive precision (ex: 14.3333333) despite the prompt.
  const round1 = (n: number) => Math.round(n * 10) / 10

  return {
    creativity:        round1(o.creativity        as number),
    clarity:           round1(o.clarity           as number),
    software_relation: round1(o.software_relation as number),
    impact:            round1(o.impact            as number),
    viability:         round1(o.viability         as number),
    score:             round1(o.score             as number),
    feedback:          (o.feedback as string).trim().slice(0, 200),
    flagged:           o.flagged           as boolean,
  }
}

/** Mark submission as error — never leaks internal message to client */
async function markError(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  submissionId: string,
  internalReason: string
): Promise<void> {
  console.error('[evaluate-submission] marking error:', internalReason)
  await supabase
    .from('submissions')
    .update({
      status: 'error',
      feedback: 'Falha na avaliação automática. Tente enviar novamente.',
    })
    .eq('id', submissionId)
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // ── 1. Parse and validate input ───────────────────────────────────────────
  let submission_id: string
  try {
    const body = await req.json()
    if (!body?.submission_id || typeof body.submission_id !== 'string') throw new Error()
    submission_id = body.submission_id
  } catch {
    return jsonResponse({ error: 'Body must be JSON with a string field "submission_id".' }, 400)
  }

  // ── 2. Supabase admin client (service role bypasses RLS) ──────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── 3. Fetch submission + round ───────────────────────────────────────────
  const { data: submission, error: fetchErr } = await supabase
    .from('submissions')
    .select(`
      id,
      mensagem,
      nota,
      status,
      round_title,
      round_prompt,
      rounds ( id, title, prompt, status )
    `)
    .eq('id', submission_id)
    .single()

  if (fetchErr || !submission) {
    return jsonResponse({ error: 'Submission not found.' }, 404)
  }

  const round = submission.rounds as RoundInfo | null

  // ── 4. Validate round is open ─────────────────────────────────────────────
  if (!round) {
    return jsonResponse({ error: 'Submission has no associated round.' }, 400)
  }
  if (round.status !== 'open') {
    return jsonResponse({ error: 'Round is not open. Evaluation rejected.' }, 400)
  }

  // O admin pode editar title/prompt de uma rodada aberta a qualquer momento.
  // A avaliação deve usar o tema que o participante viu ao enviar a mensagem
  // (snapshot salvo em submissions.round_title/round_prompt), não o tema
  // atual da rodada. Linhas antigas sem snapshot caem no tema atual.
  const evalTitle  = submission.round_title  ?? round.title
  const evalPrompt = submission.round_prompt ?? round.prompt

  // ── 5. Idempotency: already evaluated ────────────────────────────────────
  if (submission.status === 'evaluated' && submission.nota !== null) {
    return jsonResponse({ already_evaluated: true, nota: submission.nota })
  }

  // ── 6. Verify AI_API_KEY is present — NEVER sent to client ───────────────
  const AI_API_KEY = Deno.env.get('AI_API_KEY')
  if (!AI_API_KEY) {
    await markError(supabase, submission_id, 'AI_API_KEY secret not set')
    return jsonResponse(
      { error: 'AI evaluation is not configured. Contact the administrator.' },
      500
    )
  }

  // ── 7. Call AI API ────────────────────────────────────────────────────────
  let aiRawText: string

  try {
    const aiRes = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,   // key never echoed back
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:           AI_MODEL,
        temperature:     TEMPERATURE,
        max_tokens:      MAX_TOKENS,
        response_format: { type: 'json_object' },  // OpenAI JSON mode
        messages: [
          {
            role:    'system',
            content: buildSystemPrompt(evalTitle, evalPrompt),
          },
          {
            role:    'user',
            content: submission.mensagem,
          },
        ],
      }),
    })

    if (!aiRes.ok) {
      // Read body without leaking the key in logs
      const errText = await aiRes.text()
      throw new Error(`HTTP ${aiRes.status}: ${errText.slice(0, 200)}`)
    }

    const aiJson = await aiRes.json()
    aiRawText = aiJson?.choices?.[0]?.message?.content ?? ''
    if (!aiRawText) throw new Error('Empty content from AI response')

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await markError(supabase, submission_id, `AI call failed: ${msg}`)
    return jsonResponse({ error: 'AI evaluation request failed. Please try again.' }, 502)
  }

  // ── 8. Parse and validate AI JSON response ────────────────────────────────
  const criteria = parseAIResponse(aiRawText)

  if (!criteria) {
    await markError(
      supabase,
      submission_id,
      `Invalid AI JSON (first 200 chars): ${aiRawText.slice(0, 200)}`
    )
    return jsonResponse({ error: 'AI returned an unexpected format. Please try again.' }, 502)
  }

  // ── 9. Calculate and verify scores ───────────────────────────────────────
  //
  // We always compute the authoritative sum ourselves — the model's "score"
  // field is used as a cross-check signal only, not as the primary value.
  // This prevents any arithmetic errors from the model affecting the ranking.

  const computedTotal = Math.round(
    (criteria.creativity + criteria.clarity + criteria.software_relation +
     criteria.impact + criteria.viability) * 10
  ) / 10  // 0–100, 1 casa decimal

  // Warn if model's score doesn't match (log only, don't fail)
  if (Math.abs(criteria.score - computedTotal) > 0.05) {
    console.warn(
      `[evaluate-submission] score mismatch: model said ${criteria.score}, ` +
      `computed ${computedTotal}. Using computed value.`
    )
  }

  // Clamp to [0, 100] as a safety net
  const totalClamped = Math.min(100, Math.max(0, computedTotal))

  // nota é a pontuação bruta 0–100 com 1 casa decimal — granularidade extra
  // (5 critérios × 1 casa decimal) ajuda a evitar empates entre dezenas de
  // participantes concorrendo pelo mesmo tema.
  const nota = totalClamped

  const criteriosPayload = {
    creativity:        criteria.creativity,
    clarity:           criteria.clarity,
    software_relation: criteria.software_relation,
    impact:            criteria.impact,
    viability:         criteria.viability,
    score:             totalClamped,   // authoritative computed value
    flagged:           criteria.flagged,
  }

  // ── 10. Persist evaluation result ─────────────────────────────────────────
  //
  // Quando `flagged = true`, a submissão é automaticamente ocultada do ranking.
  // Isso garante que conteúdo inapropriado nunca apareça publicamente, mesmo que
  // o admin não revise manualmente. O campo `hidden` é verificado pela ranking_view
  // com `WHERE NOT hidden` e pela função `isExcludedFromRanking()` no cliente.
  const { error: updateErr } = await supabase
    .from('submissions')
    .update({
      nota,
      criterios: criteriosPayload,
      feedback:  criteria.feedback,
      status:    'evaluated',
      // Auto-oculta conteúdo sinalizado pela IA como inapropriado.
      // O admin pode reverter manualmente via painel /admin.
      ...(criteria.flagged ? { hidden: true } : {}),
    })
    .eq('id', submission_id)

  if (updateErr) {
    console.error('[evaluate-submission] DB update failed:', updateErr.message)
    // Don't mark as error — the evaluation succeeded, only persistence failed
    return jsonResponse({ error: 'Failed to save evaluation. Please try again.' }, 500)
  }

  // ── 11. Return result ─────────────────────────────────────────────────────
  return jsonResponse({
    nota,
    criterios: criteriosPayload,
    feedback:  criteria.feedback,
  })
})
