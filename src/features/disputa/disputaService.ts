import { supabase } from '../../lib/supabase'
import type { Database, Round, Player, Submission, RankingEntry } from '../../lib/types'

export type { Round, Player, Submission, RankingEntry }
export type RankingViewRow = Database['public']['Views']['ranking_view']['Row']

type SubmissionRow = Database['public']['Tables']['submissions']['Row']

// ── Helpers ────────────────────────────────────────────────────────────────

function toSubmission(row: SubmissionRow): Submission {
  return { ...row, avaliada: row.nota !== null }
}

/**
 * Determina se uma submissão deve ser excluída do ranking.
 *
 * Critérios de exclusão:
 * - `hidden = true`  : ocultada manualmente pelo admin
 * - `flagged = true` : conteúdo inapropriado detectado pela IA
 *   (a Edge Function também seta `hidden = true` automaticamente,
 *    mas esta verificação garante consistência no cálculo client-side)
 * - `status = 'error'` : avaliação falhou — nota nunca será preenchida
 * - `nota = null`    : ainda não avaliada (pendente)
 */
function isExcludedFromRanking(s: Submission): boolean {
  if (s.hidden) return true
  if (s.status === 'error') return true
  if (s.nota === null) return true
  // Verifica flag da IA armazenada no campo criterios (jsonb)
  const criterios = s.criterios as { flagged?: boolean } | null
  if (criterios?.flagged === true) return true
  return false
}

// ── Ranking ────────────────────────────────────────────────────────────────
// Desempate: 1) melhor nota DESC  2) tentativas ASC  3) data da melhor nota ASC
//
// Esta função é usada apenas como fallback quando `ranking_view` não está
// disponível. O servidor (ranking_view) é a fonte de verdade — ele já aplica
// os mesmos filtros e critérios de desempate via SQL.

export function computeRanking(players: Player[], submissions: Submission[]): RankingEntry[] {
  type Acc = {
    player: Player
    melhor_nota: number | null
    tentativas: number
    primeira_melhor_em: string | null
  }

  const map = new Map<string, Acc>()
  for (const p of players) {
    map.set(p.id, { player: p, melhor_nota: null, tentativas: 0, primeira_melhor_em: null })
  }

  for (const s of submissions) {
    // Pula submissões excluídas do ranking (hidden, flagged, error, pending)
    if (isExcludedFromRanking(s)) continue

    const entry = map.get(s.player_id)
    if (!entry) continue
    entry.tentativas++
    // Nota já verificada como não-nula por isExcludedFromRanking
    if (s.nota !== null && (entry.melhor_nota === null || s.nota > entry.melhor_nota)) {
      entry.melhor_nota = s.nota
      entry.primeira_melhor_em = s.created_at
    }
  }

  // Só inclui players com pelo menos uma nota válida
  return [...map.values()]
    .filter((e): e is Acc & { melhor_nota: number } => e.melhor_nota !== null)
    .sort((a, b) => {
      if (b.melhor_nota !== a.melhor_nota) return b.melhor_nota - a.melhor_nota
      if (a.tentativas !== b.tentativas) return a.tentativas - b.tentativas
      return (a.primeira_melhor_em ?? '').localeCompare(b.primeira_melhor_em ?? '')
    })
    .map((e, i) => ({
      posicao: i + 1,
      player: { nome: e.player.nome, escola: e.player.escola },
      melhor_nota: e.melhor_nota,
      tentativas: e.tentativas,
    }))
}

// ── Round ──────────────────────────────────────────────────────────────────

export async function getRoundAtiva(): Promise<Round | null> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('status', 'open')
    .single()
  if (error) { console.error('[getRoundAtiva]', error.message); return null }
  return data
}

/**
 * Assina mudanças na rodada informada (ex: admin fecha a rodada enquanto o
 * jogador está com a página aberta). Chama `onChange` com a linha atualizada.
 */
export function subscribeToRoundChanges(
  roundId: string,
  onChange: (round: Round) => void
): () => void {
  const channel = supabase
    .channel(`round-${roundId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${roundId}` },
      (payload) => { onChange(payload.new as Round) }
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// ── Players ────────────────────────────────────────────────────────────────

export async function upsertPlayer(
  roundId: string,
  deviceId: string,
  nome: string,
  escola: string | null
): Promise<Player | null> {
  // Identidade do jogador é (round_id, nome) — não device_id. Isso permite
  // que o mesmo aparelho/aba envie como "pessoas" diferentes trocando o nome,
  // cada uma com seu próprio histórico e nota no ranking.
  const { data, error } = await supabase
    .from('players')
    .upsert(
      { round_id: roundId, device_id: deviceId, nome, escola },
      { onConflict: 'round_id,nome' }
    )
    .select()
    .single()
  if (error) { console.error('[upsertPlayer]', error.message); return null }
  return data
}

export async function getPlayers(roundId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('round_id', roundId)
  if (error) { console.error('[getPlayers]', error.message); return [] }
  return data ?? []
}

// ── Submissions ────────────────────────────────────────────────────────────

export async function getSubmissions(roundId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('round_id', roundId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[getSubmissions]', error.message); return [] }
  return (data ?? []).map(toSubmission)
}

export async function criarSubmission(
  roundId: string,
  playerId: string,
  mensagem: string,
  roundTitle: string,
  roundPrompt: string,
  disciplina: string
): Promise<Submission | null> {
  // Grava um snapshot do tema vigente no envio — o admin pode alterar o tema
  // de uma rodada aberta a qualquer momento, e a avaliação por IA deve usar
  // o tema que o participante realmente viu, não o tema atual da rodada.
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      round_id: roundId,
      player_id: playerId,
      mensagem,
      round_title: roundTitle,
      round_prompt: roundPrompt,
      // Conferida e recompensada no servidor (evaluate-submission), não aqui.
      disciplina,
    })
    .select()
    .single()
  if (error) { console.error('[criarSubmission]', error.message); return null }
  return toSubmission(data)
}

// ── Edge Function ──────────────────────────────────────────────────────────

export interface EvalResult {
  nota: number
  feedback: string
  criterios: {
    creativity:        number
    clarity:           number
    software_relation: number
    impact:            number
    viability:         number
    score:             number
    flagged:           boolean
    disciplina_valida: boolean
    disciplina_bonus:  number
  }
}

export async function evaluateSubmission(submissionId: string): Promise<EvalResult | null> {
  const { data, error } = await supabase.functions.invoke<EvalResult>(
    'evaluate-submission',
    { body: { submission_id: submissionId } }
  )
  if (error) { console.error('[evaluate-submission]', error.message); return null }
  return data
}

// ── Ranking view (server-computed) ────────────────────────────────────────
//
// A `ranking_view` é a fonte de verdade. Ela já aplica:
//   - WHERE NOT hidden         (exclui conteúdo ocultado pelo admin)
//   - WHERE NOT flagged        (via `hidden` setado pela Edge Function)
//   - HAVING MAX(nota) IS NOT NULL  (exclui participantes sem avaliação)
// Não há necessidade de filtrar no cliente — isso é garantido pelo banco.

export async function getRankingView(roundId: string): Promise<RankingEntry[]> {
  const { data, error } = await supabase
    .from('ranking_view')
    .select('*')
    .eq('round_id', roundId)
    .order('posicao', { ascending: true })
  if (error) { console.error('[getRankingView]', error.message); return [] }
  return (data ?? []).map((row) => ({
    posicao: row.posicao ?? 0,
    player: { nome: row.nome, escola: row.escola },
    melhor_nota: row.melhor_nota,
    tentativas: Number(row.tentativas),
  }))
}

// ── Realtime ───────────────────────────────────────────────────────────────

/**
 * Subscribes to INSERT and UPDATE events on `submissions` and any change on
 * `players` for the given round. Calls `onRankingChange` on each event so the
 * caller can re-fetch ranking_view.
 */
export function subscribeToRankingChanges(
  roundId: string,
  onRankingChange: () => void
): () => void {
  const channel = supabase
    .channel(`ranking-${roundId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'submissions', filter: `round_id=eq.${roundId}` },
      onRankingChange
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'submissions', filter: `round_id=eq.${roundId}` },
      onRankingChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `round_id=eq.${roundId}` },
      onRankingChange
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

export function subscribeToSubmission(
  id: string,
  onUpdate: (submission: Submission) => void
): () => void {
  const channel = supabase
    .channel(`submission-result-${id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'submissions', filter: `id=eq.${id}` },
      (payload) => { onUpdate(toSubmission(payload.new as SubmissionRow)) }
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
