import { useCallback, useEffect, useRef, useState } from 'react'
import {
  abrirRound,
  criarRound,
  editarRound,
  fecharRound,
  getSubmissoesAdmin,
  getRoundStats,
  getRounds,
  ocultarSubmissao,
  subscribeToAdminSubmissoes,
  type Round,
  type RoundStats,
  type SubmissaoAdmin,
} from './adminService'

interface Flash { tipo: 'ok' | 'erro'; texto: string }

export function useAdmin() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [stats, setStats] = useState<Record<string, RoundStats>>({})
  const [submissoes, setSubmissoes] = useState<SubmissaoAdmin[]>([])
  const [regressivo, setRegressivo] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<Flash | null>(null)

  const unsubRef = useRef<(() => void) | null>(null)

  const notify = (tipo: Flash['tipo'], texto: string) => {
    setFlash({ tipo, texto })
    setTimeout(() => setFlash(null), 4000)
  }

  // ── Load all rounds + stats ───────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await getRounds()
    setRounds(r)
    const entries = await Promise.all(
      r.map(async (round) => [round.id, await getRoundStats(round.id)] as const)
    )
    setStats(Object.fromEntries(entries))
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const roundAtiva = rounds.find(r => r.status === 'open') ?? null

  // ── Rodada selecionada para visualização de mensagens ─────────────────────
  // Independente da rodada ativa: o admin pode clicar em qualquer rodada
  // (aberta ou fechada) na lista para ver suas submissões. Enquanto nada for
  // selecionado manualmente, acompanha a rodada ativa automaticamente.
  const [roundSelecionadaId, setRoundSelecionadaId] = useState<string | null>(null)
  const roundSelecionada = rounds.find(r => r.id === roundSelecionadaId) ?? roundAtiva ?? null

  const carregarSubmissoes = useCallback(async (roundId: string) => {
    const subs = await getSubmissoesAdmin(roundId)
    setSubmissoes(subs)
  }, [])

  useEffect(() => {
    unsubRef.current?.()
    unsubRef.current = null

    if (!roundSelecionada) { setSubmissoes([]); return }

    carregarSubmissoes(roundSelecionada.id)
    unsubRef.current = subscribeToAdminSubmissoes(roundSelecionada.id, () => {
      carregarSubmissoes(roundSelecionada.id)
    })

    return () => { unsubRef.current?.() }
  }, [roundSelecionada?.id, carregarSubmissoes]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!roundAtiva?.started_at || !roundAtiva.duration_minutes) {
      setRegressivo(null)
      return
    }

    const calc = () => {
      const end = new Date(roundAtiva.started_at!).getTime() +
                  roundAtiva.duration_minutes! * 60_000
      setRegressivo(Math.max(0, Math.ceil((end - Date.now()) / 1000)))
    }

    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [roundAtiva?.started_at, roundAtiva?.duration_minutes])

  // ── Actions ───────────────────────────────────────────────────────────────

  const novaRound = async (
    title: string,
    prompt: string,
    duration_minutes?: number | null,
    abrirImediatamente = false
  ) => {
    const r = await criarRound(title, prompt, duration_minutes)
    if (!r) { notify('erro', 'Falha ao criar rodada.'); return null }
    if (abrirImediatamente) await abrirRound(r.id)
    notify('ok', abrirImediatamente ? 'Rodada criada e aberta!' : 'Rodada criada.')
    carregar()
    return r
  }

  const abrir = async (id: string) => {
    const ok = await abrirRound(id)
    if (ok) { notify('ok', 'Rodada aberta!'); carregar() }
    else notify('erro', 'Falha ao abrir rodada.')
  }

  const fechar = async (id: string) => {
    const ok = await fecharRound(id)
    if (ok) { notify('ok', 'Rodada encerrada.'); carregar() }
    else notify('erro', 'Falha ao encerrar rodada.')
  }

  const editar = async (
    id: string,
    data: { title?: string; prompt?: string; duration_minutes?: number | null }
  ) => {
    const ok = await editarRound(id, data)
    if (ok) { notify('ok', 'Rodada atualizada.'); carregar() }
    else notify('erro', 'Falha ao atualizar rodada.')
    return ok
  }

  const zerarRanking = async () => {
    if (!roundAtiva) return
    const nova = await criarRound(
      roundAtiva.title,
      roundAtiva.prompt,
      roundAtiva.duration_minutes
    )
    if (!nova) { notify('erro', 'Falha ao criar nova rodada.'); return }
    const ok = await abrirRound(nova.id)
    if (ok) { notify('ok', 'Ranking zerado — nova rodada aberta!'); carregar() }
    else notify('erro', 'Rodada criada mas falha ao abrir.')
  }

  const ocultar = async (id: string, hidden: boolean) => {
    const ok = await ocultarSubmissao(id, hidden)
    if (ok) {
      setSubmissoes(prev =>
        prev.map(s => s.id === id ? { ...s, hidden } : s)
      )
    } else notify('erro', 'Falha ao alterar visibilidade.')
  }

  return {
    rounds,
    roundAtiva,
    roundSelecionada,
    selecionarRound: setRoundSelecionadaId,
    stats,
    submissoes,
    regressivo,
    loading,
    flash,
    novaRound,
    abrir,
    fechar,
    editar,
    zerarRanking,
    ocultar,
  }
}
