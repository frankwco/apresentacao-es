import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { UltimaSubmissao } from './useDisputa'
import { LIMITES } from '../../lib/validacao'

const MAX_CHARS        = LIMITES.MENSAGEM_MAX
const COOLDOWN_SECONDS = 10

interface Props {
  onEnviar: (nome: string, escola: string | null, mensagem: string, disciplina: string) => Promise<boolean>
  enviando: boolean
  cooldownRestante: number
  ultimaSubmissao: UltimaSubmissao | null
  erro: string | null
  roundAtiva: boolean
  prompt?: string | null
}

export function FormularioEnvio({
  onEnviar, enviando, cooldownRestante, ultimaSubmissao, erro, roundAtiva, prompt,
}: Props) {
  const [nome, setNome]             = useState('')
  const [escola, setEscola]         = useState('')
  const [mensagem, setMensagem]     = useState('')
  const [disciplina, setDisciplina] = useState('')

  const restante   = MAX_CHARS - mensagem.length
  const emCooldown = cooldownRestante > 0
  const podeEnviar =
    roundAtiva && !enviando && !emCooldown &&
    nome.trim().length > 0 &&
    mensagem.trim().length > 0 &&
    mensagem.length <= MAX_CHARS &&
    disciplina.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeEnviar) return
    const ok = await onEnviar(nome.trim(), escola.trim() || null, mensagem.trim(), disciplina.trim())
    if (ok) setMensagem('')
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-900">Enviar mensagem</h2>

      {/* Prompt da rodada */}
      {prompt && (
        <div className="rounded-xl border-l-4 border-green-500 bg-green-50 pl-4 pr-3 py-3">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Tema da rodada</p>
          <p className="text-gray-700 text-sm leading-relaxed">{prompt}</p>
        </div>
      )}

      {!roundAtiva && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Aguardando o administrador iniciar uma rodada...
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Nome" required>
            <input
              type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Seu nome" disabled={!roundAtiva}
              className={inputCls}
            />
          </Campo>
          <Campo label="Escola / Turma" hint="opcional">
            <input
              type="text" value={escola} onChange={e => setEscola(e.target.value)}
              placeholder="Ex: IFPR – 3B" disabled={!roundAtiva}
              className={inputCls}
            />
          </Campo>
        </div>

        <Campo
          label="Disciplina do curso que mais te chamou atenção" required
          hint={<>confira a <Link to="/curso" className="underline hover:text-green-700">grade curricular</Link> — acertar vale +5 pontos</>}
        >
          <input
            type="text" value={disciplina} onChange={e => setDisciplina(e.target.value)}
            placeholder="Ex: Programação Web" disabled={!roundAtiva}
            className={inputCls}
          />
        </Campo>

        <Campo
          label="Mensagem" required
          right={
            <span className={`text-xs font-mono tabular-nums ${
              restante < 0 ? 'text-red-600' : restante < 50 ? 'text-orange-500' :
              restante < 100 ? 'text-amber-500' : 'text-gray-400'
            }`}>
              {restante}/{MAX_CHARS}
            </span>
          }
        >
          <textarea
            value={mensagem} onChange={e => setMensagem(e.target.value)}
            rows={6} placeholder="Digite sua mensagem aqui..." disabled={!roundAtiva}
            className={`${inputCls} resize-none`}
          />
        </Campo>

        {erro && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {erro}
          </div>
        )}

        <SubmitButton
          podeEnviar={podeEnviar}
          enviando={enviando}
          emCooldown={emCooldown}
          cooldownRestante={cooldownRestante}
        />
      </form>

      {ultimaSubmissao && <PainelResultado sub={ultimaSubmissao} />}
    </div>
  )
}

function SubmitButton({ podeEnviar, enviando, emCooldown, cooldownRestante }: {
  podeEnviar: boolean; enviando: boolean; emCooldown: boolean; cooldownRestante: number
}) {
  const pct = emCooldown ? (cooldownRestante / COOLDOWN_SECONDS) * 100 : 0
  return (
    <button
      type="submit"
      disabled={!podeEnviar}
      className="relative w-full rounded-xl overflow-hidden py-3 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed"
      style={{
        background: emCooldown ? '#f9fafb' : enviando ? '#16a34a' : podeEnviar ? '#16a34a' : '#f3f4f6',
        color:      emCooldown ? '#b45309' : podeEnviar || enviando ? 'white' : '#9ca3af',
        border:     emCooldown ? '1px solid #fcd34d' : '1px solid transparent',
      }}
    >
      {emCooldown && (
        <span
          className="absolute inset-0 bg-amber-100 origin-left transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {enviando ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
            Registrando...
          </>
        ) : emCooldown ? (
          <>
            <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current" aria-hidden>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
            </svg>
            Aguarde {cooldownRestante}s
          </>
        ) : 'Enviar mensagem'}
      </span>
    </button>
  )
}

function PainelResultado({ sub }: { sub: UltimaSubmissao }) {
  if (sub.erroIA) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        ⚠️ Falha na avaliação. Verifique se a Edge Function está implantada.
      </div>
    )
  }
  if (sub.aguardando) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
          <span className="text-sm text-blue-700 font-semibold">Avaliando com IA...</span>
        </div>
        <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-blue-400 rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    )
  }

  const crit = sub.criterios
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden animate-slide-up">
      <div className="px-5 py-4 flex items-center gap-4 border-b border-green-100">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Sua nota</p>
          <div className="flex items-baseline gap-1.5">
            <span
              key={sub.nota}
              className="text-5xl font-black text-green-700 tabular-nums leading-none animate-score-reveal"
            >
              {sub.nota?.toFixed(1)}
            </span>
            <span className="text-gray-400 text-lg font-medium">/100</span>
          </div>
        </div>
        {crit && (
          <div className="flex-1 ml-2">
            <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Score total</div>
            <div className="h-2 bg-green-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full"
                style={{ width: `${crit.score}%`, transition: 'width 0.8s ease' }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1 tabular-nums">{crit.score.toFixed(1)} / 100</div>
          </div>
        )}
      </div>

      {crit && crit.disciplina_bonus > 0 && (
        <div className="px-5 py-2 bg-green-100 border-b border-green-200 flex items-center gap-1.5 text-xs font-semibold text-green-800">
          🎓 +{crit.disciplina_bonus} pontos de bônus — disciplina correta!
        </div>
      )}
      {crit && crit.disciplina_bonus === 0 && !crit.disciplina_valida && !crit.flagged && (
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
          Essa disciplina não bateu com a grade curricular — confira a{' '}
          <Link to="/curso" className="underline hover:text-amber-900">grade do curso</Link> e tente de novo.
        </div>
      )}

      {crit && (
        <div className="px-5 py-3 grid grid-cols-2 gap-x-5 gap-y-2.5 border-b border-green-100">
          {([
            ['Criatividade',  crit.creativity],
            ['Clareza',        crit.clarity],
            ['Relação ES',     crit.software_relation],
            ['Impacto',        crit.impact],
            ['Viabilidade',    crit.viability],
          ] as [string, number][]).map(([label, val]) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-700 font-bold tabular-nums">{val.toFixed(1)}<span className="text-gray-400">/20</span></span>
              </div>
              <div className="h-1.5 bg-green-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full"
                  style={{ width: `${(val / 20) * 100}%`, transition: 'width 0.7s ease' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {sub.feedback && (
        <div className="px-5 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Feedback da IA</p>
          <p className="text-sm text-gray-700 leading-relaxed italic">{sub.feedback}</p>
        </div>
      )}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-gray-900 ' +
  'placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 ' +
  'focus:ring-2 focus:ring-green-500/15 ' +
  'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all'

function Campo({ label, hint, required, right, children }: {
  label: string; hint?: React.ReactNode; required?: boolean
  right?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-600">
          {label}
          {required && <span className="text-green-600 ml-0.5">*</span>}
          {hint && <span className="text-gray-400 ml-1 font-normal">({hint})</span>}
        </label>
        {right}
      </div>
      {children}
    </div>
  )
}
