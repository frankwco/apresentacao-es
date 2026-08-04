import { useCallback, useEffect, useRef, useState } from 'react'
import { getDeviceId, getCooldownRestante, salvarCooldown } from '../../lib/deviceId'
import { normalizarTexto, validarNome, validarEscola, validarMensagem, validarDisciplina, mensagemAmigavel } from '../../lib/validacao'
import {
  criarSubmission,
  evaluateSubmission,
  getRankingView,
  getRoundAtiva,
  getSubmissions,
  subscribeToRankingChanges,
  subscribeToRoundChanges,
  subscribeToSubmission,
  upsertPlayer,
  type EvalResult,
  type RankingEntry,
  type Round,
  type Submission,
} from './disputaService'

// ── Types ──────────────────────────────────────────────────────────────────

export interface UltimaSubmissao {
  nota: number | null
  feedback: string | null
  criterios: EvalResult['criterios'] | null
  aguardando: boolean
  erroIA: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

// COOLDOWN_SECONDS deve coincidir com COOLDOWN_MS em deviceId.ts
const COOLDOWN_SECONDS = 10

// ── Hook ───────────────────────────────────────────────────────────────────

export function useDisputa() {
  const [round, setRound] = useState<Round | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [rankingUpdatedAt, setRankingUpdatedAt] = useState(0)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [cooldownRestante, setCooldownRestante] = useState(0)
  const [ultimaSubmissao, setUltimaSubmissao] = useState<UltimaSubmissao | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const lastEnvioAtRef = useRef<number | null>(null)
  const unsubResultRef  = useRef<(() => void) | null>(null)
  // Ref estável ao round atual para evitar closures obsoletas em callbacks de Realtime
  const roundRef        = useRef<Round | null>(null)

  useEffect(() => { roundRef.current = round }, [round])

  // ── Cooldown countdown ────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (lastEnvioAtRef.current === null) return
      const elapsed = (Date.now() - lastEnvioAtRef.current) / 1000
      const restante = Math.max(0, COOLDOWN_SECONDS - elapsed)
      setCooldownRestante(Math.ceil(restante))
      if (restante === 0) lastEnvioAtRef.current = null
    }, 250)
    return () => clearInterval(id)
  }, [])

  // ── Refresh ranking from server view ─────────────────────────────────────
  const refreshRanking = useCallback(async (roundId: string) => {
    const fresh = await getRankingView(roundId)
    setRanking(fresh)
    setRankingUpdatedAt(Date.now())
  }, [])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | undefined

    async function init() {
      setLoading(true)

      const r = await getRoundAtiva()
      if (cancelled) return
      setRound(r)
      roundRef.current = r

      if (r) {
        // Restaura cooldown persistido — impede burlar via F5
        const cd = getCooldownRestante(r.id)
        if (cd > 0) {
          lastEnvioAtRef.current = Date.now() - (COOLDOWN_SECONDS - cd) * 1000
          setCooldownRestante(cd)
        }
        // Load ranking view + submissions in parallel
        const [, subs] = await Promise.all([
          refreshRanking(r.id),
          getSubmissions(r.id),
        ])
        if (cancelled) return
        setSubmissions(subs)

        // Subscribe: reload ranking_view on any relevant DB change
        // (guarded by `cancelled` so React StrictMode's double-invoke in dev
        // doesn't try to re-subscribe to a channel topic that's still joining)
        const unsubRanking = subscribeToRankingChanges(r.id, () => {
          const currentRound = roundRef.current
          if (currentRound) refreshRanking(currentRound.id)
        })

        // Subscribe: reflect status changes (ex: admin fecha a rodada) sem
        // precisar recarregar a página — mantém `round`/`roundRef` em dia.
        const unsubRound = subscribeToRoundChanges(r.id, (updated) => {
          setRound(updated)
          roundRef.current = updated
        })

        unsub = () => { unsubRanking(); unsubRound() }
      }

      setLoading(false)
    }

    init()
    return () => { cancelled = true; unsub?.() }
  }, [refreshRanking])

  // Cleanup per-submission subscription on unmount
  useEffect(() => () => { unsubResultRef.current?.() }, [])

  // ── enviar ────────────────────────────────────────────────────────────────
  const enviar = useCallback(
    async (nome: string, escola: string | null, mensagem: string, disciplina: string): Promise<boolean> => {
      const currentRound = roundRef.current

      if (!currentRound) {
        setErro('Nenhuma rodada ativa. Aguarde o administrador.')
        return false
      }
      if (currentRound.status !== 'open') {
        setErro('A rodada está encerrada.')
        return false
      }
      if (currentRound.started_at && currentRound.duration_minutes) {
        const end = new Date(currentRound.started_at).getTime() + currentRound.duration_minutes * 60_000
        if (Date.now() >= end) {
          setErro('A rodada está encerrada.')
          return false
        }
      }

      // Bloqueia enquanto a carga inicial ainda não completou
      if (loading) return false

      if (cooldownRestante > 0) {
        setErro(`Aguarde ${cooldownRestante}s antes de enviar novamente.`)
        return false
      }

      // ── Normalização e validação dos campos ───────────────────────────────
      // normalizarTexto remove caracteres de controle e colapsa espaços
      // antes da validação de tamanho — garante consistência com o banco.
      const nomeNorm       = normalizarTexto(nome)
      const escolaNorm     = escola ? normalizarTexto(escola) : null
      const mensagemNorm   = normalizarTexto(mensagem)
      const disciplinaNorm = normalizarTexto(disciplina)

      const erroNome = validarNome(nomeNorm)
      if (erroNome) { setErro(erroNome); return false }

      if (escolaNorm !== null) {
        const erroEscola = validarEscola(escolaNorm)
        if (erroEscola) { setErro(erroEscola); return false }
      }

      const erroMensagem = validarMensagem(mensagemNorm)
      if (erroMensagem) { setErro(erroMensagem); return false }

      const erroDisciplina = validarDisciplina(disciplinaNorm)
      if (erroDisciplina) { setErro(erroDisciplina); return false }

      setEnviando(true)
      setErro(null)
      setUltimaSubmissao(null)

      // 1. Upsert player (cria ou atualiza escola para este nome na rodada)
      // Usa `upsert` com onConflict: round_id,nome — seguro chamar várias vezes.
      const deviceId = getDeviceId()
      const player = await upsertPlayer(currentRound.id, deviceId, nomeNorm, escolaNorm)
      if (!player) {
        setErro(mensagemAmigavel('player'))
        setEnviando(false)
        return false
      }

      // 2. Insere submissão com status='pending' e nota=NULL
      // A nota será preenchida de forma assíncrona pela Edge Function.
      const submission = await criarSubmission(
        currentRound.id, player.id, mensagemNorm,
        currentRound.title, currentRound.prompt, disciplinaNorm
      )
      if (!submission) {
        setErro(mensagemAmigavel('submission'))
        setEnviando(false)
        return false
      }

      // Atualiza lista local otimisticamente (sem aguardar Realtime)
      setSubmissions(prev => [submission, ...prev])

      // Inicia cooldown e persiste no localStorage
      // A persistência impede burlar o cooldown via F5
      lastEnvioAtRef.current = Date.now()
      salvarCooldown(currentRound.id)
      setCooldownRestante(COOLDOWN_SECONDS)

      setEnviando(false)
      setUltimaSubmissao({ nota: null, feedback: null, criterios: null, aguardando: true, erroIA: false })

      // 3. Assina Realtime UPDATE para esta submissão específica (fallback)
      // Se a Edge Function falhar ou demorar, o Realtime captura a atualização
      // quando a nota for gravada no banco por qualquer outro meio.
      unsubResultRef.current?.()
      unsubResultRef.current = subscribeToSubmission(submission.id, (atualizada) => {
        // status='error': Edge Function marcou como erro
        if (atualizada.status === 'error') {
          setUltimaSubmissao({
            nota: null,
            feedback: 'A avaliação automática encontrou um erro. Tente enviar novamente.',
            criterios: null,
            aguardando: false,
            erroIA: true,
          })
          unsubResultRef.current?.()
          unsubResultRef.current = null
          return
        }
        // Nota preenchida: avaliação concluída
        if (atualizada.nota !== null) {
          setUltimaSubmissao({
            nota: atualizada.nota,
            feedback: atualizada.feedback,
            criterios: atualizada.criterios as EvalResult['criterios'] | null,
            aguardando: false,
            erroIA: false,
          })
          unsubResultRef.current?.()
          unsubResultRef.current = null
        }
      })

      // 4. Chama Edge Function (caminho principal — mais rápido que aguardar Realtime)
      // Não bloqueamos a UI: a resposta chega via Promise e atualiza o estado.
      // O Realtime acima é um fallback caso a Edge Function não retorne resposta
      // (ex: timeout, erro de rede do cliente).
      evaluateSubmission(submission.id).then((result) => {
        if (result) {
          setUltimaSubmissao({
            nota: result.nota,
            feedback: result.feedback,
            criterios: result.criterios,
            aguardando: false,
            erroIA: false,
          })
          unsubResultRef.current?.()
          unsubResultRef.current = null
        } else {
          // Edge Function retornou null (erro de rede/configuração)
          // Mantemos o Realtime aberto com timeout de 60s como último recurso
          const tid = setTimeout(() => {
            setUltimaSubmissao((prev) =>
              prev?.aguardando
                ? { nota: null, feedback: null, criterios: null, aguardando: false, erroIA: true }
                : prev
            )
            unsubResultRef.current?.()
            unsubResultRef.current = null
          }, 60_000)

          const prevUnsub = unsubResultRef.current
          unsubResultRef.current = () => {
            clearTimeout(tid)
            prevUnsub?.()
          }
        }
      })

      return true
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // `loading` é incluso para bloquear envio durante carga inicial
    [cooldownRestante, loading]
  )

  return {
    round,
    ranking,
    rankingUpdatedAt,
    submissions,
    loading,
    enviando,
    cooldownRestante,
    ultimaSubmissao,
    erro,
    enviar,
  }
}
