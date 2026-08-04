/**
 * validacao.ts — Normalização e validação de entradas do usuário.
 *
 * Nota sobre XSS: o React já escapa texto em nós JSX automaticamente.
 * Estas funções cuidam de consistência e integridade do banco de dados,
 * não de escaping HTML (que o React resolve).
 *
 * As funções de validação retornam `null` quando o valor é válido,
 * ou uma string de erro amigável quando inválido.
 */

// ── Limites ───────────────────────────────────────────────────────────────────

export const LIMITES = {
  NOME_MIN:        1,
  NOME_MAX:      100,
  ESCOLA_MAX:    100,
  MENSAGEM_MIN:    1,
  MENSAGEM_MAX:  500,
  DISCIPLINA_MIN:  1,
  DISCIPLINA_MAX: 100,
} as const

// ── Normalização ──────────────────────────────────────────────────────────────

/**
 * Normaliza texto de entrada do usuário:
 * - Remove caracteres de controle ASCII (exceto quebras de linha)
 * - Converte tabs em espaço simples
 * - Colapsa múltiplos espaços consecutivos em um único
 * - Faz trim das extremidades
 *
 * Nunca retorna undefined nem lança exceção.
 */
export function normalizarTexto(texto: string): string {
  return texto
    // Remove caracteres de controle (null bytes, ESC, etc.) — mantém \n e \r
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\t/g, ' ')     // tabs → espaço simples
    .trim()
    .replace(/ {2,}/g, ' ')  // múltiplos espaços → um
}

// ── Validações ─────────────────────────────────────────────────────────────────

/** Valida o nome do participante. Retorna null se OK, mensagem de erro se inválido. */
export function validarNome(nome: string): string | null {
  const n = normalizarTexto(nome)
  if (n.length < LIMITES.NOME_MIN) return 'O nome é obrigatório.'
  if (n.length > LIMITES.NOME_MAX) return `Nome muito longo — máximo ${LIMITES.NOME_MAX} caracteres.`
  return null
}

/** Valida a escola/turma (campo opcional). */
export function validarEscola(escola: string): string | null {
  const e = normalizarTexto(escola)
  if (e.length > LIMITES.ESCOLA_MAX) return `Escola muito longa — máximo ${LIMITES.ESCOLA_MAX} caracteres.`
  return null
}

/**
 * Valida o campo de disciplina (obrigatório para enviar). Não exige que o
 * nome bata com uma disciplina real da grade — isso só define se o bônus é
 * aplicado, e é conferido no servidor (ver src/lib/disciplinas.ts).
 */
export function validarDisciplina(disciplina: string): string | null {
  const d = normalizarTexto(disciplina)
  if (d.length < LIMITES.DISCIPLINA_MIN) return 'Conte qual disciplina do curso mais chamou sua atenção.'
  if (d.length > LIMITES.DISCIPLINA_MAX) return `Nome de disciplina muito longo — máximo ${LIMITES.DISCIPLINA_MAX} caracteres.`
  return null
}

/** Valida o corpo da mensagem. */
export function validarMensagem(mensagem: string): string | null {
  const m = normalizarTexto(mensagem)
  if (m.length < LIMITES.MENSAGEM_MIN) return 'A mensagem não pode estar vazia.'
  if (m.length > LIMITES.MENSAGEM_MAX)
    return `Mensagem muito longa — máximo ${LIMITES.MENSAGEM_MAX} caracteres (atual: ${m.length}).`
  return null
}

// ── Utilitário de erro de rede ─────────────────────────────────────────────────

/**
 * Converte erros técnicos do Supabase em mensagens amigáveis ao usuário.
 * Nunca expõe detalhes internos do banco ou da API.
 */
export function mensagemAmigavel(contexto: 'player' | 'submission' | 'ranking' | 'round'): string {
  const mapa: Record<typeof contexto, string> = {
    player:     'Não foi possível registrar seu nome. Verifique a conexão e tente novamente.',
    submission: 'Falha ao enviar a mensagem. Verifique a conexão e tente novamente.',
    ranking:    'Não foi possível carregar o ranking. Tente recarregar a página.',
    round:      'Não foi possível verificar a rodada ativa. Tente recarregar a página.',
  }
  return mapa[contexto]
}
