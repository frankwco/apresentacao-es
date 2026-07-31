import { useEffect, useState } from 'react'
import { useDisputa } from './useDisputa'
import { FormularioEnvio } from './FormularioEnvio'
import { Ranking } from './Ranking'

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

export function DisputaPage() {
  const {
    round, ranking, rankingUpdatedAt, loading,
    enviando, cooldownRestante, ultimaSubmissao, erro,
    enviar,
  } = useDisputa()

  const [segsRestantes, setSegsRestantes] = useState<number | null>(null)

  useEffect(() => {
    if (!round?.started_at || !round?.duration_minutes) { setSegsRestantes(null); return }
    const calc = () => {
      const end = new Date(round.started_at!).getTime() + round.duration_minutes! * 60_000
      setSegsRestantes(Math.max(0, Math.ceil((end - Date.now()) / 1000)))
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [round?.started_at, round?.duration_minutes])

  const expired    = segsRestantes !== null && segsRestantes <= 0
  const urgent     = segsRestantes !== null && segsRestantes > 0 && segsRestantes <= 30
  const roundAberta = !loading && !!round && round.status === 'open' && !expired

  return (
    <div className="flex-1 flex flex-col">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">

          {/* Status + Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {loading ? (
                <span className="h-5 w-28 rounded-full bg-gray-200 animate-pulse" />
              ) : round ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-300 px-3 py-1 text-xs font-bold text-green-700 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  RODADA ATIVA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-300 px-3 py-1 text-xs font-bold text-gray-500 tracking-wide">
                  AGUARDANDO
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight truncate">
              {loading
                ? <span className="inline-block h-8 w-64 rounded-lg bg-gray-200 animate-pulse" />
                : (round?.title ?? 'Disputa de Mensagens')}
            </h1>
          </div>

          {/* Countdown */}
          {segsRestantes !== null && (
            <div className={`flex-shrink-0 flex flex-col items-center justify-center rounded-2xl border px-6 py-4 min-w-[110px] text-center ${
              expired  ? 'border-red-300 bg-red-50'
              : urgent ? 'border-orange-300 bg-orange-50'
              :          'border-gray-200 bg-gray-50'
            }`}>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                {expired ? 'ENCERRADO' : 'Tempo'}
              </span>
              <span className={`text-4xl md:text-5xl font-black tabular-nums font-mono leading-none ${
                expired ? 'text-red-600' : urgent ? 'text-orange-600 animate-urgency' : 'text-gray-900'
              }`}>
                {fmt(segsRestantes)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <FormularioEnvio
            onEnviar={enviar}
            enviando={enviando}
            cooldownRestante={cooldownRestante}
            ultimaSubmissao={ultimaSubmissao}
            erro={erro}
            roundAtiva={roundAberta}
            prompt={round?.prompt}
          />
          <Ranking ranking={ranking} loading={loading} updatedAt={rankingUpdatedAt} />
        </div>
      </div>
    </div>
  )
}
