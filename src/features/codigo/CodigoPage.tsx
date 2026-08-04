// ─────────────────────────────────────────────────────────────────────────────
// /codigo — Vitrine técnica: como este sistema foi construído
// ─────────────────────────────────────────────────────────────────────────────

// ── Code snippets (defined outside JSX to avoid parsing issues) ───────────────

const SNIPPET_HOOK = `\
// src/features/disputa/useDisputa.ts
export function useDisputa() {
  const [round, setRound]     = useState<Round | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refreshRanking = useCallback(async (roundId: string) => {
    const fresh = await getRankingView(roundId)   // consulta ranking_view
    setRanking(fresh)
    setRankingUpdatedAt(Date.now())               // dispara animação
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const r = await getRoundAtiva()             // busca rodada aberta
      setRound(r)
      if (r) {
        await refreshRanking(r.id)
        subscribeToRankingChanges(r.id, () =>     // escuta mudanças
          refreshRanking(r.id)
        )
      }
      setLoading(false)
    }
    init()
  }, [refreshRanking])

  return { round, ranking, loading, enviar, cooldownRestante }
}`

const SNIPPET_REALTIME = `\
// src/features/disputa/disputaService.ts
export function subscribeToRankingChanges(
  roundId: string,
  onRankingChange: () => void
): () => void {
  const channel = supabase
    .channel(\`ranking-\${roundId}\`)            // canal nomeado por rodada
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',                        // INSERT e UPDATE
        schema: 'public',
        table:  'submissions',
        filter: \`round_id=eq.\${roundId}\`,      // filtro server-side
      },
      onRankingChange                            // callback sem re-fetch manual
    )
    .subscribe()

  return () => supabase.removeChannel(channel)   // cleanup ao desmontar
}`

const SNIPPET_SQL_VIEW = `\
-- supabase/schema.sql
CREATE OR REPLACE VIEW ranking_view AS
WITH best_per_player AS (
  SELECT
    player_id, round_id,
    MAX(nota)  AS melhor_nota,    -- melhor das tentativas
    COUNT(*)   AS tentativas      -- total de envios
  FROM submissions
  WHERE NOT hidden                -- exclui conteúdo ocultado pelo admin
  GROUP BY player_id, round_id
  HAVING MAX(nota) IS NOT NULL
)
SELECT
  ROW_NUMBER() OVER (
    PARTITION BY bp.round_id
    ORDER BY
      bp.melhor_nota         DESC,   -- 1º critério: maior nota
      bp.tentativas          ASC,    -- 2º: menos tentativas
      fb.primeira_melhor_nota_em ASC -- 3º: chegou primeiro
  ) AS posicao,
  p.nome, p.escola,
  bp.melhor_nota, bp.tentativas
FROM best_per_player bp
JOIN players p ON bp.player_id = p.id;`

const SNIPPET_RLS = `\
-- Políticas de Row Level Security (RLS)
-- Qualquer pessoa pode LER; ESCREVER só com regras

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Leitura pública (ranking visível para todos)
CREATE POLICY "submissions_public_read"
  ON submissions FOR SELECT USING (true);

-- Inserção apenas em rodadas abertas (validada no banco!)
CREATE POLICY "submissions_insert_open_round"
  ON submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE id = round_id AND status = 'open'
    )
  );`

const SNIPPET_EDGE_FN = `\
// supabase/functions/evaluate-submission/index.ts  (Deno)
Deno.serve(async (req) => {
  const { submission_id } = await req.json()

  // 1. Busca submissão + prompt da rodada (service role — sem RLS)
  const { data: submission } = await supabase
    .from('submissions')
    .select('mensagem, rounds(title, prompt, status)')
    .eq('id', submission_id)
    .single()

  // 2. Chama a IA — chave NUNCA vai ao browser
  const AI_API_KEY = Deno.env.get('AI_API_KEY')
  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: \`Bearer \${AI_API_KEY}\` },
    body: JSON.stringify({
      model:           'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(round) },
        { role: 'user',   content: submission.mensagem },
      ],
    }),
  })

  // 3. Valida JSON, calcula nota, salva no banco
  const criteria = parseAIResponse(await aiRes.json())
  const nota = (criteria.creativity + criteria.clarity +
                criteria.software_relation + criteria.impact) / 10
  await supabase.from('submissions')
    .update({ nota, criterios: criteria, status: 'evaluated' })
    .eq('id', submission_id)

  return Response.json({ nota, feedback: criteria.feedback })
})`

const SNIPPET_SUPABASE_CLIENT = `\
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Apenas a anon key vai ao frontend (segura com RLS ativo)
// A service_role key fica SOMENTE nas Edge Functions
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// isSupabaseConfigured: booleano para mostrar banner de config
export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY`

const SNIPPET_FOLDER = `\
src/
├── features/                  ← organizado por domínio de negócio
│   ├── disputa/               ← tela principal + votação
│   │   ├── DisputaPage.tsx
│   │   ├── FormularioEnvio.tsx
│   │   ├── Ranking.tsx
│   │   ├── useDisputa.ts      ← Custom Hook (estado + lógica)
│   │   └── disputaService.ts  ← chamadas ao Supabase
│   ├── admin/                 ← painel administrativo
│   │   ├── AdminPage.tsx
│   │   ├── useAdmin.ts
│   │   └── adminService.ts
│   ├── curso/                 ← apresentação do curso
│   └── codigo/                ← esta página
├── lib/
│   ├── supabase.ts            ← cliente tipado
│   ├── types.ts               ← schema do banco em TypeScript
│   └── deviceId.ts            ← ID anônimo via localStorage
├── components/
│   ├── Layout.tsx             ← shell responsivo
│   └── NavBar.tsx
└── router.tsx                 ← rotas declarativas

supabase/
├── schema.sql                 ← schema completo com RLS e triggers
└── functions/
    └── evaluate-submission/
        └── index.ts           ← Edge Function (Deno)`

// ── Dados das seções ──────────────────────────────────────────────────────────

const ARCH_DIAGRAM = `\
 ╔══════════════════════════════════════════════════════════╗
 ║              BROWSER  (React + TypeScript)               ║
 ║  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  ║
 ║  │ DisputaPage│  │ AdminPage  │  │CursoPage/Codigo  │  ║
 ║  └──────┬─────┘  └──────┬─────┘  └──────────────────┘  ║
 ║         └───────────────┤                               ║
 ║                 Supabase JS Client                       ║
 ╚══════════════════╤═══════╤══════════════════════════════╝
                    │       │
          REST/HTTP │       │ WebSocket
                    ▼       ▼
 ╔══════════════════════════════════════════════════════════╗
 ║                   SUPABASE  (BaaS)                       ║
 ║  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  ║
 ║  │  PostgREST   │  │  Realtime   │  │ Edge Functions│  ║
 ║  │  (CRUD API)  │  │  Channels   │  │ evaluate-sub  │  ║
 ║  └──────┬───────┘  └──────┬──────┘  └───────┬───────┘  ║
 ║         └─────────────────┤          AI_API_KEY (secret)║
 ║                   ┌───────▼───────┐           │         ║
 ║                   │  PostgreSQL   │     ┌─────▼──────┐  ║
 ║                   │  rounds       │     │  OpenAI    │  ║
 ║                   │  players      │     │  gpt-4o    │  ║
 ║                   │  submissions  │     └────────────┘  ║
 ║                   │  ranking_view │                     ║
 ║                   │  RLS policies │                     ║
 ║                   └───────────────┘                     ║
 ╚══════════════════════════════════════════════════════════╝`

const camadas = [
  {
    id: 'frontend',
    badge: 'FRONTEND',
    cor: 'blue',
    icon: '⚛️',
    titulo: 'React + TypeScript',
    subtitulo: 'Interface declarativa, tipagem forte, zero erros em produção',
    pontos: [
      'React 19 com Hooks — toda a lógica de estado fica em Custom Hooks reutilizáveis',
      'TypeScript garante que os tipos do banco de dados batem com os tipos da UI',
      'TailwindCSS v4 — CSS gerado apenas para as classes realmente usadas',
      'React Router v7 — roteamento declarativo com rotas aninhadas e Outlet',
      'Vite — servidor de desenvolvimento ultrarrápido com Hot Module Replacement',
    ],
    snippet: SNIPPET_HOOK,
    snipFile: 'useDisputa.ts',
    snipLang: 'TypeScript',
    conceito: 'Paradigmas de Programação · Padrões de Projeto · Desenvolvimento Web',
  },
  {
    id: 'backend',
    badge: 'BACKEND / BAAS',
    cor: 'green',
    icon: '🗄️',
    titulo: 'Supabase como Backend-as-a-Service',
    subtitulo: 'Banco de dados, autenticação, tempo real e funções — sem servidor próprio',
    pontos: [
      'PostgREST transforma o PostgreSQL em uma API REST automaticamente',
      'Apenas a anon key (pública) vai ao frontend; service_role key fica nas Edge Functions',
      'Row Level Security (RLS) garante que as regras de acesso ficam no banco de dados',
      'Sem Express.js, sem servidor Node — o Supabase é o backend',
    ],
    snippet: SNIPPET_SUPABASE_CLIENT,
    snipFile: 'supabase.ts',
    snipLang: 'TypeScript',
    conceito: 'Segurança da Informação · Arquitetura de Software · Desenvolvimento Web',
  },
  {
    id: 'banco',
    badge: 'BANCO DE DADOS',
    cor: 'yellow',
    icon: '🐘',
    titulo: 'PostgreSQL + Views + Triggers',
    subtitulo: 'O ranking é calculado pelo banco, não pelo JavaScript',
    pontos: [
      'ranking_view usa ROW_NUMBER() com três níveis de desempate — tudo em SQL',
      'Triggers garantem que só uma rodada fique aberta por vez (integridade)',
      'Row Level Security (RLS) impede que usuários anônimos escrevam onde não devem',
      'CHECK constraints validam dados no nível do banco — impossível burlar via API',
    ],
    snippet: SNIPPET_RLS,
    snipFile: 'schema.sql',
    snipLang: 'SQL',
    conceito: 'Banco de Dados I e II · Engenharia de Requisitos · Segurança',
  },
  {
    id: 'ia',
    badge: 'INTELIGÊNCIA ARTIFICIAL',
    cor: 'purple',
    icon: '🤖',
    titulo: 'Edge Function + OpenAI',
    subtitulo: 'A avaliação roda no servidor — a chave da IA nunca vai ao browser',
    pontos: [
      'Edge Function em Deno TypeScript roda na borda da rede (baixa latência)',
      'Prompt de sistema define critérios: criatividade, clareza, relação com ES, impacto',
      'response_format: json_object força o modelo a retornar JSON válido',
      'Validação do schema da resposta — fallback por regex se o modelo divagar',
      'score calculado pelo servidor, não pela IA — evita erros aritméticos',
    ],
    snippet: SNIPPET_EDGE_FN,
    snipFile: 'evaluate-submission/index.ts',
    snipLang: 'TypeScript (Deno)',
    conceito: 'Inteligência Artificial · Segurança · Arquitetura de Software',
  },
  {
    id: 'realtime',
    badge: 'TEMPO REAL',
    cor: 'cyan',
    icon: '⚡',
    titulo: 'Supabase Realtime Channels',
    subtitulo: 'O ranking atualiza sem F5 — WebSockets com filtro server-side',
    pontos: [
      'Supabase Realtime escuta alterações no PostgreSQL via WAL (Write-Ahead Log)',
      'filter: round_id=eq.{id} — só eventos da rodada atual chegam ao cliente',
      'Canal nomeado por rodada — múltiplas abas sincronizadas automaticamente',
      'Cleanup automático: removeChannel() ao desmontar o componente',
      'Animação no ranking detecta mudanças de posição via useRef',
    ],
    snippet: SNIPPET_REALTIME,
    snipFile: 'disputaService.ts',
    snipLang: 'TypeScript',
    conceito: 'Redes de Computadores · Desenvolvimento Web · Arquitetura de Software',
  },
]

const conceitos = [
  { disciplina: 'Algoritmos e Programação', aplicacao: 'Lógica dos Custom Hooks, computação do ranking' },
  { disciplina: 'Banco de Dados', aplicacao: 'Schema PostgreSQL, ranking_view, triggers e RLS' },
  { disciplina: 'Engenharia de Requisitos', aplicacao: 'Tabela rounds com prompt e duração configuráveis' },
  { disciplina: 'Engenharia de Software', aplicacao: 'Feature-based structure, service layer, custom hooks' },
  { disciplina: 'Segurança da Informação', aplicacao: 'RLS, anon key, AI_API_KEY nunca no frontend' },
  { disciplina: 'Redes de Computadores', aplicacao: 'WebSockets, Realtime Channels, REST API' },
  { disciplina: 'Inteligência Artificial', aplicacao: 'Prompt engineering, avaliação automática por IA' },
  { disciplina: 'Arquitetura de Software', aplicacao: 'BaaS, Edge Functions, separação de responsabilidades' },
  { disciplina: 'Qualidade de Software', aplicacao: 'TypeScript, validação de JSON, tipos gerados do schema' },
  { disciplina: 'Teste de Software', aplicacao: 'parseAIResponse valida schema rigorosamente antes de salvar' },
]

// ── Componentes ───────────────────────────────────────────────────────────────

const corBadge: Record<string, string> = {
  blue:   'bg-blue-900/40 text-blue-400 ring-blue-700/50',
  green:  'bg-green-900/40 text-green-400 ring-green-700/50',
  yellow: 'bg-yellow-900/40 text-yellow-400 ring-yellow-700/50',
  purple: 'bg-purple-900/40 text-purple-400 ring-purple-700/50',
  cyan:   'bg-cyan-900/40 text-cyan-400 ring-cyan-700/50',
}

const corBorder: Record<string, string> = {
  blue:   'border-blue-800/40',
  green:  'border-green-800/40',
  yellow: 'border-yellow-800/40',
  purple: 'border-purple-800/40',
  cyan:   'border-cyan-800/40',
}

function CodeBlock({
  code, filename, lang,
}: { code: string; filename: string; lang: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/50 bg-gray-950 text-left">
      {/* Traffic-light header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900/80 border-b border-gray-700/50">
        <div className="flex gap-1.5 flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
        <span className="text-xs text-gray-400 font-mono flex-1 truncate">{filename}</span>
        <span className="text-xs text-gray-600 font-mono flex-shrink-0">{lang}</span>
      </div>
      <pre className="p-4 md:p-5 text-xs md:text-[13px] text-gray-300 font-mono leading-relaxed overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export function CodigoPage() {
  return (
    <div className="flex-1 w-full">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-purple-950/50 to-gray-950 px-4 py-20 text-center border-b border-purple-900/30">
        <span className="inline-block rounded-full bg-purple-900/50 px-3 py-1 text-xs font-semibold text-purple-400 ring-1 ring-purple-700/50 mb-6">
          VITRINE TÉCNICA
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Este sistema é uma aula{' '}
          <span className="text-purple-400">em código</span>
        </h1>
        <p className="mt-5 text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
          Cada feature que você usa aqui demonstra conceitos reais ensinados no curso
          de Engenharia de Software do IFPR — frontend, banco de dados, IA e tempo real.
        </p>
        {/* Tech pill badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs font-mono">
          {['React 19', 'TypeScript', 'Vite', 'TailwindCSS', 'Supabase', 'PostgreSQL', 'Realtime', 'Edge Functions', 'OpenAI', 'Deno', 'RLS', 'React Router'].map(t => (
            <span key={t} className="rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-gray-400">
              {t}
            </span>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">

        {/* ── DIAGRAMA ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">Arquitetura geral</h2>
          <p className="text-gray-500 mb-6">
            Uma SPA sem servidor próprio. O Supabase faz o papel de backend completo —
            API REST, autenticação, WebSockets e banco de dados em um só serviço.
          </p>
          <div className="rounded-2xl overflow-hidden border border-gray-700/50 bg-gray-950">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900/80 border-b border-gray-700/50">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
              <span className="text-xs text-gray-500 font-mono">architecture.txt</span>
            </div>
            <pre className="p-4 md:p-6 text-xs md:text-sm text-green-400 font-mono leading-relaxed overflow-x-auto">
              {ARCH_DIAGRAM}
            </pre>
          </div>
        </section>

        {/* ── CAMADAS ───────────────────────────────────────────────────────── */}
        {camadas.map((c) => (
          <section key={c.id}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{c.icon}</span>
              <div>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${corBadge[c.cor]}`}>
                  {c.badge}
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1 leading-tight">
                  {c.titulo}
                </h2>
              </div>
            </div>
            <p className="text-gray-500 mb-6">{c.subtitulo}</p>

            <div className="grid gap-6 lg:grid-cols-2 items-start">
              <div className={`rounded-2xl border bg-white shadow-sm p-6 space-y-4 h-full ${corBorder[c.cor]}`}>
                <ul className="space-y-3">
                  {c.pontos.map(p => (
                    <li key={p} className="flex items-start gap-3 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-2" />
                      <span className="text-gray-600 leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Disciplina no curso</p>
                  <p className="text-xs text-gray-500 font-mono">{c.conceito}</p>
                </div>
              </div>

              {/* Code snippet */}
              <CodeBlock code={c.snippet} filename={c.snipFile} lang={c.snipLang} />
            </div>
          </section>
        ))}

        {/* ── BANCO — SQL VIEW ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🏆</span>
            <div>
              <span className="inline-block rounded-full bg-amber-100 text-amber-700 border border-amber-300 px-2.5 py-0.5 text-xs font-bold">
                BANCO DE DADOS — VIEW
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">O ranking é calculado em SQL</h2>
            </div>
          </div>
          <p className="text-gray-500 mb-6">
            Em vez de calcular a classificação em JavaScript, usamos uma VIEW do PostgreSQL.
            O banco já devolve os dados ordenados com os critérios de desempate corretos.
          </p>
          <CodeBlock code={SNIPPET_SQL_VIEW} filename="schema.sql — ranking_view" lang="SQL" />
        </section>

        {/* ── MAPEAMENTO CONCEITO → APLICAÇÃO ──────────────────────────────── */}
        <section>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
            Curso → Código
          </h2>
          <p className="text-gray-500 mb-8">
            Cada disciplina do curso tem ao menos um ponto de contato com este sistema.
          </p>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Disciplina</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Onde aparece neste sistema</th>
                </tr>
              </thead>
              <tbody>
                {conceitos.map((c, i) => (
                  <tr key={c.disciplina} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-5 py-3 text-gray-800 font-medium border-t border-gray-100">{c.disciplina}</td>
                    <td className="px-5 py-3 text-gray-500 border-t border-gray-100">{c.aplicacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── ESTRUTURA DE PASTAS ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Estrutura de pastas</h2>
          <p className="text-gray-500 mb-6">
            Organização por feature (domínio de negócio) — cada pasta contém tela,
            hook e service da sua responsabilidade.
          </p>
          <CodeBlock code={SNIPPET_FOLDER} filename="apresentacao-es/" lang="tree" />
        </section>

        {/* ── GITHUB CTA ────────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-8 py-12 text-center">
          <div className="text-5xl mb-4">🐙</div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Código aberto no GitHub</h2>
          <p className="text-gray-500 max-w-lg mx-auto mb-8 text-sm leading-relaxed">
            Todo o código-fonte deste sistema está disponível para estudo.
            Faça um fork, explore os commits e veja como cada feature foi construída passo a passo.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://github.com/IFPR-ES/apresentacao-es" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-6 py-2.5 text-sm font-bold hover:bg-gray-700 transition-colors shadow-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
              </svg>
              Ver no GitHub
            </a>
            <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              Docs do Supabase ↗
            </a>
            <a href="https://react.dev" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              Docs do React ↗
            </a>
          </div>
        </section>

      </div>
    </div>
  )
}
