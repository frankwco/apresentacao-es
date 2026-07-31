import { useEffect, useRef, useState } from 'react'
import type { RankingEntry } from './disputaService'

function rowKey(e: RankingEntry) {
  return `${e.player.nome}|||${e.player.escola ?? ''}`
}

const TOP3 = {
  1: { medal: '🥇', border: 'border-amber-300', bg: 'from-amber-50 to-yellow-50', nota: 'text-amber-700', ring: 'ring-amber-200' },
  2: { medal: '🥈', border: 'border-slate-300',  bg: 'from-slate-50 to-gray-50',  nota: 'text-slate-500',  ring: 'ring-slate-200' },
  3: { medal: '🥉', border: 'border-orange-200', bg: 'from-orange-50 to-amber-50', nota: 'text-orange-600', ring: 'ring-orange-100' },
} as const

function PodiumCard({ entry, lifted }: { entry: RankingEntry; lifted: boolean }) {
  const pos = entry.posicao as 1 | 2 | 3
  const t   = TOP3[pos]
  return (
    <li className={`relative rounded-2xl border bg-gradient-to-br p-4 ring-1 shadow-sm transition-all duration-500
      ${t.border} ${t.bg} ${t.ring} ${lifted ? 'animate-row-lift scale-[1.01]' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-3xl leading-none select-none">{t.medal}</span>
        <span className={`text-3xl font-black tabular-nums leading-none ${t.nota}`}>
          {entry.melhor_nota.toFixed(1)}
          <span className="text-sm font-medium opacity-50 ml-0.5">/100</span>
        </span>
      </div>
      <p className="text-gray-900 font-bold text-base leading-tight truncate">{entry.player.nome}</p>
      {entry.player.escola && <p className="text-gray-400 text-xs truncate mt-0.5">{entry.player.escola}</p>}
      <p className="text-gray-400 text-xs mt-2 tabular-nums">
        {entry.tentativas} {entry.tentativas === 1 ? 'tentativa' : 'tentativas'}
      </p>
    </li>
  )
}

function CompactRow({ entry, lifted }: { entry: RankingEntry; lifted: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 transition-all duration-500
      ${lifted ? 'animate-row-lift border-green-300 bg-green-50' : ''}`}>
      <span className="w-7 text-center text-sm font-bold text-gray-400 tabular-nums flex-shrink-0">
        {entry.posicao}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-sm font-medium truncate">{entry.player.nome}</p>
        {entry.player.escola && <p className="text-gray-400 text-xs truncate">{entry.player.escola}</p>}
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-green-700 font-black tabular-nums text-sm">{entry.melhor_nota.toFixed(1)}</span>
        <span className="text-gray-400 text-xs tabular-nums">{entry.tentativas}×</span>
      </div>
    </li>
  )
}

interface Props { ranking: RankingEntry[]; loading: boolean; updatedAt: number }

export function Ranking({ ranking, loading, updatedAt }: Props) {
  const [flashing, setFlashing] = useState(false)
  const prevUpdatedAt = useRef(0)

  useEffect(() => {
    if (updatedAt === 0 || updatedAt === prevUpdatedAt.current) return
    prevUpdatedAt.current = updatedAt
    setFlashing(true)
    const t = setTimeout(() => setFlashing(false), 1200)
    return () => clearTimeout(t)
  }, [updatedAt])

  const prevPositions = useRef<Record<string, number>>({})
  const [liftedKeys, setLiftedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (updatedAt === 0) return
    const lifted = new Set<string>()
    for (const e of ranking) {
      const prev = prevPositions.current[rowKey(e)]
      if (prev !== undefined && e.posicao < prev) lifted.add(rowKey(e))
    }
    setLiftedKeys(lifted)
    const next: Record<string, number> = {}
    for (const e of ranking) next[rowKey(e)] = e.posicao
    prevPositions.current = next
    if (lifted.size > 0) {
      const t = setTimeout(() => setLiftedKeys(new Set()), 1500)
      return () => clearTimeout(t)
    }
  }, [ranking, updatedAt])

  const top3 = ranking.filter(e => e.posicao <= 3)
  const rest = ranking.filter(e => e.posicao > 3)

  return (
    <div className={`rounded-2xl border bg-white shadow-sm flex flex-col gap-4 p-5 transition-all duration-700
      ${flashing ? 'border-green-400 shadow-green-100 shadow-md' : 'border-gray-200'}`}>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Ranking</h2>
        <div className="flex items-center gap-1.5">
          {loading ? (
            <span className="text-xs text-gray-400">Carregando...</span>
          ) : flashing ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping flex-shrink-0" />
              <span className="text-xs text-green-600 font-semibold">Atualizando</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <span className="text-xs text-gray-400">Tempo real</span>
            </>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-gray-100 animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
          ))}
        </div>
      )}

      {!loading && ranking.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <span className="text-5xl select-none opacity-40">🏆</span>
          <p className="text-gray-700 text-sm font-semibold">Nenhuma pontuação ainda</p>
          <p className="text-gray-400 text-xs max-w-[200px] leading-relaxed">
            Envie uma mensagem e aguarde a avaliação da IA para entrar no ranking.
          </p>
        </div>
      )}

      {!loading && top3.length > 0 && (
        <ul className="grid grid-cols-1 gap-2.5">
          {top3.map(e => <PodiumCard key={rowKey(e)} entry={e} lifted={liftedKeys.has(rowKey(e))} />)}
        </ul>
      )}

      {!loading && rest.length > 0 && (
        <>
          {top3.length > 0 && <div className="border-t border-gray-100" />}
          <ul className="flex flex-col gap-1.5">
            {rest.map(e => <CompactRow key={rowKey(e)} entry={e} lifted={liftedKeys.has(rowKey(e))} />)}
          </ul>
        </>
      )}
    </div>
  )
}
