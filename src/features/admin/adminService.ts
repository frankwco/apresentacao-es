import { supabase } from '../../lib/supabase'
import type { Round } from '../../lib/types'

export type { Round }

// ── Rounds ────────────────────────────────────────────────────────────────

export async function getRounds(): Promise<Round[]> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('[getRounds]', error.message); return [] }
  return data ?? []
}

export async function criarRound(
  title: string,
  prompt: string,
  duration_minutes?: number | null
): Promise<Round | null> {
  const { data, error } = await supabase
    .from('rounds')
    .insert({ title, prompt, status: 'closed', duration_minutes: duration_minutes ?? null })
    .select()
    .single()
  if (error) { console.error('[criarRound]', error.message); return null }
  return data
}

export async function editarRound(
  id: string,
  updates: { title?: string; prompt?: string; duration_minutes?: number | null }
): Promise<boolean> {
  const { error } = await supabase
    .from('rounds')
    .update(updates)
    .eq('id', id)
  if (error) { console.error('[editarRound]', error.message); return false }
  return true
}

export async function abrirRound(id: string): Promise<boolean> {
  // DB trigger enforce_single_open_round handles closing all others
  const { error } = await supabase
    .from('rounds')
    .update({ status: 'open' })
    .eq('id', id)
  if (error) { console.error('[abrirRound]', error.message); return false }
  return true
}

export async function fecharRound(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('rounds')
    .update({ status: 'closed' })
    .eq('id', id)
  if (error) { console.error('[fecharRound]', error.message); return false }
  return true
}

// ── Submissions ────────────────────────────────────────────────────────────

export interface SubmissaoAdmin {
  id: string
  mensagem: string
  disciplina: string | null
  nota: number | null
  feedback: string | null
  hidden: boolean
  created_at: string
  player: { nome: string; escola: string | null }
}

export async function getSubmissoesAdmin(
  roundId: string,
  limite = 40
): Promise<SubmissaoAdmin[]> {
  const { data: subs, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('round_id', roundId)
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) { console.error('[getSubmissoesAdmin]', error.message); return [] }
  if (!subs?.length) return []

  const playerIds = [...new Set(subs.map(s => s.player_id))]
  const { data: players } = await supabase
    .from('players')
    .select('id, nome, escola')
    .in('id', playerIds)

  const pm = new Map((players ?? []).map(p => [p.id, { nome: p.nome, escola: p.escola }]))

  return subs.map(s => ({
    id: s.id,
    mensagem: s.mensagem,
    disciplina: s.disciplina,
    nota: s.nota,
    feedback: s.feedback,
    hidden: s.hidden ?? false,
    created_at: s.created_at,
    player: pm.get(s.player_id) ?? { nome: '—', escola: null },
  }))
}

export async function ocultarSubmissao(id: string, hidden: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('submissions')
    .update({ hidden })
    .eq('id', id)
  if (error) { console.error('[ocultarSubmissao]', error.message); return false }
  return true
}

// ── Stats ─────────────────────────────────────────────────────────────────

export interface RoundStats {
  players: number
  submissions: number
}

export async function getRoundStats(roundId: string): Promise<RoundStats> {
  const [{ count: players }, { count: submissions }] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('round_id', roundId),
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('round_id', roundId),
  ])
  return { players: players ?? 0, submissions: submissions ?? 0 }
}

// ── Realtime ──────────────────────────────────────────────────────────────

export function subscribeToAdminSubmissoes(
  roundId: string,
  onChange: () => void
): () => void {
  const channel = supabase
    .channel(`admin-subs-${roundId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions', filter: `round_id=eq.${roundId}` }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
