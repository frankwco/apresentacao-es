/**
 * disciplinas.ts — Fonte única da grade curricular oficial (Quadro 5 do PPC).
 *
 * Usado por:
 *   - CursoPage (exibição da grade curricular)
 *   - FormularioEnvio / useDisputa (bônus por citar disciplina correta na disputa)
 *   - supabase/functions/evaluate-submission (validação server-side do bônus —
 *     importado via caminho relativo, já que Edge Functions em Deno resolvem
 *     módulos TypeScript locais diretamente)
 *
 * Conteúdo alinhado ao PPC (Projeto Pedagógico de Curso) de Engenharia de
 * Software do IFPR – Campus Paranavaí, versão 2025 (Resolução n.º 37/2018).
 * Fonte: https://ifpr.edu.br/paranavai/wp-content/uploads/sites/21/2025/01/PPC-de-Engenharia-de-Software-2025.pdf
 */

export interface DisciplinaGrade {
  nome: string
  ch: number
}

export interface PeriodoGrade {
  periodo: number
  label: string
  ch: number
  disciplinas: DisciplinaGrade[]
}

// Matriz curricular oficial (Quadro 5 do PPC) — regime ANUAL, não semestral.
// Carga horária (ch) em horas-aula (50min), conforme convenção do documento.
export const grade: PeriodoGrade[] = [
  { periodo: 1, label: '1º Ano', ch: 800, disciplinas: [
    { nome: 'Ética, Cultura e Sociedade', ch: 80 },
    { nome: 'Engenharia Econômica', ch: 80 },
    { nome: 'Inglês Instrumental', ch: 80 },
    { nome: 'Leitura e Produção de Gêneros Acadêmicos', ch: 80 },
    { nome: 'Matemática Discreta e Lógica', ch: 80 },
    { nome: 'Algoritmos e Estruturas de Dados I', ch: 160 },
    { nome: 'Banco de Dados I', ch: 80 },
    { nome: 'Engenharia de Software', ch: 80 },
    { nome: 'Metodologia de Pesquisa em Engenharia de Software', ch: 80 },
  ] },
  { periodo: 2, label: '2º Ano', ch: 800, disciplinas: [
    { nome: 'Cálculo', ch: 80 },
    { nome: 'Empreendedorismo em Tecnologia da Informação', ch: 80 },
    { nome: 'Algoritmos e Estruturas de Dados II', ch: 80 },
    { nome: 'Arquitetura de Computadores', ch: 80 },
    { nome: 'Banco de Dados II', ch: 80 },
    { nome: 'Programação Orientada a Objetos', ch: 160 },
    { nome: 'Práticas de Extensão', ch: 160 },
    { nome: 'Análise e Projeto de Sistemas', ch: 80 },
  ] },
  { periodo: 3, label: '3º Ano', ch: 800, disciplinas: [
    { nome: 'Probabilidade e Estatística', ch: 80 },
    { nome: 'Desenvolvimento para Dispositivos Móveis', ch: 160 },
    { nome: 'Programação Web', ch: 160 },
    { nome: 'Sistemas Operacionais', ch: 80 },
    { nome: 'Arquitetura e Padrões de Software', ch: 80 },
    { nome: 'Construção de Software', ch: 80 },
    { nome: 'Projeto Integrador', ch: 80 },
    { nome: 'Interação Humano-Computador', ch: 80 },
  ] },
  { periodo: 4, label: '4º Ano', ch: 720, disciplinas: [
    { nome: 'Redes de Computadores e Segurança', ch: 80 },
    { nome: 'Tópicos em Computação', ch: 160 },
    { nome: 'Governança e Gestão de Serviços de Software', ch: 80 },
    { nome: 'Novas Aplicações em Engenharia de Software', ch: 80 },
    { nome: 'Projeto de Software Avançado', ch: 160 },
    { nome: 'Teste de Software', ch: 80 },
    { nome: 'Trabalho de Conclusão de Curso', ch: 80 },
  ] },
]

export const NOMES_DISCIPLINAS: string[] = grade.flatMap(p => p.disciplinas.map(d => d.nome))

/** Remove acentos e normaliza espaços/caixa para comparação tolerante a erros de digitação simples. */
export function normalizarNomeDisciplina(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacriticos (marcas de combinacao pos-NFD)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Verifica se `input` corresponde a uma disciplina oficial da grade
 * (case-insensitive, ignorando acentos). Retorna o nome oficial (com
 * acentuação correta) em caso de correspondência, ou `null`.
 */
export function encontrarDisciplina(input: string): string | null {
  const alvo = normalizarNomeDisciplina(input)
  if (!alvo) return null
  return NOMES_DISCIPLINAS.find(nome => normalizarNomeDisciplina(nome) === alvo) ?? null
}
