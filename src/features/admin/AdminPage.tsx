/**
 * AUTENTICAÇÃO DO PAINEL ADMIN
 * ─────────────────────────────────────────────────────────────────────────────
 * Senha simples via VITE_ADMIN_PASSWORD — NÃO SEGURO PARA PRODUÇÃO.
 * Para produção use Supabase Auth: https://supabase.com/docs/guides/auth
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import { useAdmin } from './useAdmin'
import type { Round, SubmissaoAdmin } from './adminService'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined
const SESSION_KEY    = 'es_admin_auth'

function checkAuth(): boolean {
  if (!ADMIN_PASSWORD) return true
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro]   = useState(false)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (senha === ADMIN_PASSWORD) { sessionStorage.setItem(SESSION_KEY, '1'); onSuccess() }
    else { setErro(true); setSenha('') }
  }
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-sm p-8 space-y-6">
        <div className="text-center">
          <span className="text-3xl">🔒</span>
          <h1 className="text-xl font-bold text-gray-900 mt-3">Painel Administrativo</h1>
          <p className="text-gray-500 text-sm mt-1">Digite a senha para continuar</p>
          {!ADMIN_PASSWORD && (
            <p className="text-amber-700 text-xs mt-2 border border-amber-200 rounded-lg px-3 py-1.5 bg-amber-50">
              VITE_ADMIN_PASSWORD não definida — acesso liberado
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password" value={senha}
            onChange={e => { setSenha(e.target.value); setErro(false) }}
            placeholder="Senha" autoFocus
            className={`w-full rounded-xl bg-white border px-4 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none transition-colors ${
              erro ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-green-500'
            }`}
          />
          {erro && <p className="text-red-600 text-xs">Senha incorreta.</p>}
          <button type="submit" className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const inputCls =
  'w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-gray-900 ' +
  'placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15 transition-all'

function Btn({ children, onClick, color = 'green', size = 'md', type = 'button', disabled }: {
  children: React.ReactNode; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  color?: 'green' | 'red' | 'yellow' | 'gray'; size?: 'sm' | 'md'
  type?: 'button' | 'submit'; disabled?: boolean
}) {
  const sz  = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'
  const col = {
    green:  'border-green-400  bg-green-50  text-green-700  hover:bg-green-100',
    red:    'border-red-300    bg-red-50    text-red-700    hover:bg-red-100',
    yellow: 'border-amber-300  bg-amber-50  text-amber-700  hover:bg-amber-100',
    gray:   'border-gray-300   bg-gray-50   text-gray-700   hover:bg-gray-100',
  }[color]
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`rounded-lg border font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${sz} ${col}`}>
      {children}
    </button>
  )
}

function PainelRodadaAtiva({ round, stats, regressivo, onFechar, onEditar, onZerarRanking }: {
  round: Round; stats?: { players: number; submissions: number }
  regressivo: number | null
  onFechar: () => void
  onEditar: (data: { title?: string; prompt?: string; duration_minutes?: number | null }) => Promise<boolean>
  onZerarRanking: () => void
}) {
  const [editandoPrompt, setEditandoPrompt] = useState(false)
  const [promptDraft, setPromptDraft]       = useState(round.prompt)
  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [tituloDraft, setTituloDraft]       = useState(round.title)
  const [durDraft, setDurDraft]             = useState(String(round.duration_minutes ?? ''))
  const expired = regressivo !== null && regressivo <= 0
  const urgent  = regressivo !== null && regressivo > 0 && regressivo <= 30

  return (
    <section className="rounded-2xl border border-green-300 bg-green-50 p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 border border-green-400 px-3 py-1 text-xs font-bold text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          RODADA ABERTA
        </span>
        {expired && <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-300 rounded-full px-2 py-0.5">TEMPO ESGOTADO</span>}
      </div>

      {editandoTitulo ? (
        <div className="space-y-2">
          <input value={tituloDraft} onChange={e => setTituloDraft(e.target.value)} className={inputCls} />
          <div className="flex items-center gap-2">
            <input type="number" value={durDraft} onChange={e => setDurDraft(e.target.value)} className={`${inputCls} w-28`} placeholder="min" min={1} />
            <span className="text-xs text-gray-500">minutos</span>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" color="green" onClick={async () => { const ok = await onEditar({ title: tituloDraft.trim(), duration_minutes: durDraft ? Number(durDraft) : null }); if (ok) setEditandoTitulo(false) }}>Salvar</Btn>
            <Btn size="sm" color="gray" onClick={() => setEditandoTitulo(false)}>Cancelar</Btn>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <h2 className="text-lg font-bold text-gray-900 flex-1">{round.title}</h2>
          <button onClick={() => { setTituloDraft(round.title); setDurDraft(String(round.duration_minutes ?? '')); setEditandoTitulo(true) }} className="text-gray-400 hover:text-gray-700 text-xs mt-0.5 flex-shrink-0">✏️</button>
        </div>
      )}

      {regressivo !== null && (
        <div className={`text-center rounded-xl border py-3 ${expired ? 'border-red-300 bg-red-50' : urgent ? 'border-orange-300 bg-orange-50' : 'border-green-200 bg-white'}`}>
          <p className={`text-4xl font-black tabular-nums tracking-tight font-mono ${expired ? 'text-red-600' : urgent ? 'text-orange-600 animate-urgency' : 'text-gray-900'}`}>{fmt(regressivo)}</p>
          <p className="text-xs text-gray-400 mt-0.5">restantes</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enunciado</p>
          {!editandoPrompt && <button onClick={() => { setPromptDraft(round.prompt); setEditandoPrompt(true) }} className="text-xs text-gray-400 hover:text-gray-700">editar</button>}
        </div>
        {editandoPrompt ? (
          <div className="space-y-2">
            <textarea value={promptDraft} onChange={e => setPromptDraft(e.target.value)} rows={4} className={`${inputCls} resize-none`} />
            <div className="flex gap-2">
              <Btn size="sm" color="green" onClick={async () => { const ok = await onEditar({ prompt: promptDraft.trim() }); if (ok) setEditandoPrompt(false) }}>Salvar</Btn>
              <Btn size="sm" color="gray" onClick={() => setEditandoPrompt(false)}>Cancelar</Btn>
            </div>
          </div>
        ) : <p className="text-gray-700 text-sm leading-relaxed">{round.prompt}</p>}
      </div>

      {stats && (
        <div className="flex gap-6 text-sm text-gray-500 border-t border-green-200 pt-3">
          <span>👥 <strong className="text-gray-900">{stats.players}</strong> participantes</span>
          <span>📝 <strong className="text-gray-900">{stats.submissions}</strong> submissões</span>
        </div>
      )}
      <div className="flex gap-2 flex-wrap border-t border-green-200 pt-3">
        <Btn color="red" onClick={onFechar}>Encerrar rodada</Btn>
        <Btn color="yellow" onClick={onZerarRanking}>Zerar ranking</Btn>
      </div>
    </section>
  )
}

function FormNovaRodada({ onCriar }: { onCriar: (t: string, p: string, d?: number | null, a?: boolean) => void }) {
  const [title, setTitle]     = useState('')
  const [prompt, setPrompt]   = useState('')
  const [duration, setDuration] = useState('')
  const valid = title.trim() && prompt.trim()
  const dur = duration ? Number(duration) : null
  const submit = (abrir: boolean) => { if (!valid) return; onCriar(title.trim(), prompt.trim(), dur, abrir); setTitle(''); setPrompt(''); setDuration('') }
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Nova rodada</h2>
      <div className="space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da rodada" className={inputCls} />
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Enunciado / tema exibido aos participantes" rows={4} className={`${inputCls} resize-none`} />
        <div className="flex items-center gap-2">
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duração" min={1} className={`${inputCls} w-28`} />
          <span className="text-xs text-gray-500">minutos (opcional)</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn color="green" onClick={() => submit(true)} disabled={!valid}>Criar e abrir</Btn>
          <Btn color="gray" onClick={() => submit(false)} disabled={!valid}>Criar fechada</Btn>
        </div>
      </div>
    </section>
  )
}

function ListaRodadas({ rounds, stats, roundAtivaId, roundSelecionadaId, onSelecionar, onAbrir, onFechar }: {
  rounds: Round[]; stats: Record<string, { players: number; submissions: number }>
  roundAtivaId?: string; roundSelecionadaId?: string
  onSelecionar: (id: string) => void; onAbrir: (id: string) => void; onFechar: (id: string) => void
}) {
  if (rounds.length === 0) return <p className="text-gray-400 text-sm">Nenhuma rodada criada ainda.</p>
  return (
    <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {rounds.map(r => {
        const isAtiva      = r.id === roundAtivaId
        const isSelecionada = r.id === roundSelecionadaId
        return (
          <li
            key={r.id}
            onClick={() => onSelecionar(r.id)}
            title="Ver mensagens desta rodada"
            className={`rounded-xl border p-3 space-y-2 cursor-pointer transition-colors ${
              isSelecionada ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
              : isAtiva      ? 'border-green-300 bg-green-50'
              :                'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium truncate">{r.title}</p>
                <p className="text-gray-400 text-xs tabular-nums">
                  {stats[r.id] ? `${stats[r.id].players}p · ${stats[r.id].submissions}s` : '—'}
                  {r.duration_minutes ? ` · ${r.duration_minutes}min` : ''}
                </p>
              </div>
              <span className={`flex-shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${isAtiva ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                {isAtiva ? 'ABERTA' : 'FECHADA'}
              </span>
            </div>
            {!isAtiva && <Btn size="sm" color="green" onClick={(e) => { e.stopPropagation(); onAbrir(r.id) }}>Abrir</Btn>}
            {isAtiva  && <Btn size="sm" color="red"   onClick={(e) => { e.stopPropagation(); onFechar(r.id) }}>Encerrar</Btn>}
          </li>
        )
      })}
    </ul>
  )
}

function ListaSubmissoes({ submissoes, onOcultar }: {
  submissoes: SubmissaoAdmin[]; onOcultar: (id: string, hidden: boolean) => void
}) {
  const [mostrarOcultas, setMostrarOcultas] = useState(false)
  const visiveis = mostrarOcultas ? submissoes : submissoes.filter(s => !s.hidden)
  if (submissoes.length === 0) return <p className="text-gray-400 text-sm">Nenhuma submissão ainda.</p>
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{submissoes.length} submissões</span>
        <button onClick={() => setMostrarOcultas(v => !v)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          {mostrarOcultas ? 'Ocultar removidas' : `Mostrar removidas (${submissoes.filter(s => s.hidden).length})`}
        </button>
      </div>
      <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {visiveis.map(s => (
          <li key={s.id} className={`rounded-xl border p-3 space-y-1.5 ${s.hidden ? 'border-gray-200 bg-gray-50 opacity-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-gray-900 text-xs font-semibold">{s.player.nome}</p>
                  {s.player.escola && <p className="text-gray-400 text-xs">{s.player.escola}</p>}
                  {s.nota !== null && <span className="text-green-700 font-bold text-xs">{s.nota.toFixed(1)}/100</span>}
                  {s.nota === null && <span className="text-blue-600 text-xs">avaliando...</span>}
                </div>
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{s.mensagem}</p>
              </div>
              <button onClick={() => onOcultar(s.id, !s.hidden)} title={s.hidden ? 'Restaurar' : 'Ocultar'}
                className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors text-base">
                {s.hidden ? '👁️' : '🚫'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminPage() {
  const [autenticado, setAutenticado] = useState(checkAuth)
  const {
    rounds, roundAtiva, roundSelecionada, selecionarRound,
    stats, submissoes, regressivo, loading, flash,
    novaRound, abrir, fechar, editar, zerarRanking, ocultar,
  } = useAdmin()

  if (!autenticado) return <PasswordGate onSuccess={() => setAutenticado(true)} />

  const logout = () => { sessionStorage.removeItem(SESSION_KEY); setAutenticado(false) }

  return (
    <div className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Painel Administrativo</h1>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-900 border border-gray-300 bg-white rounded-lg px-3 py-1.5 transition-colors shadow-sm">
          Sair
        </button>
      </div>

      {flash && (
        <div className={`mb-6 rounded-xl border p-4 text-sm font-medium ${
          flash.tipo === 'ok'
            ? 'border-green-300 bg-green-50 text-green-700'
            : 'border-red-300 bg-red-50 text-red-700'
        }`}>
          {flash.texto}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-2xl bg-gray-200 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 items-start">
          <div className="space-y-6">
            {roundAtiva && (
              <PainelRodadaAtiva round={roundAtiva} stats={stats[roundAtiva.id]} regressivo={regressivo}
                onFechar={() => fechar(roundAtiva.id)}
                onEditar={(data) => editar(roundAtiva.id, data)}
                onZerarRanking={zerarRanking}
              />
            )}
            <FormNovaRodada onCriar={(t, p, d, a) => novaRound(t, p, d, a)} />
          </div>
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Rodadas</h2>
              <p className="text-xs text-gray-400 -mt-2">Clique em uma rodada para ver as mensagens enviadas nela.</p>
              <ListaRodadas
                rounds={rounds} stats={stats}
                roundAtivaId={roundAtiva?.id} roundSelecionadaId={roundSelecionada?.id}
                onSelecionar={selecionarRound} onAbrir={abrir} onFechar={fechar}
              />
            </section>
            {roundSelecionada && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 truncate">Mensagens — {roundSelecionada.title}</h2>
                <ListaSubmissoes submissoes={submissoes} onOcultar={ocultar} />
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
