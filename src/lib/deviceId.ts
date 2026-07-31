const KEY = 'es_ifpr_device_id'

/**
 * Retorna um identificador anônimo estável para este dispositivo/browser.
 * Gerado uma vez e persistido no localStorage.
 * Não contém dados pessoais — usado apenas para vincular submissões ao mesmo
 * participante dentro de uma rodada.
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // localStorage indisponível (modo privado, SSR, etc.)
    return crypto.randomUUID()
  }
}

// ── Cooldown persistido por dispositivo e rodada ──────────────────────────────
//
// Persistir o timestamp no localStorage impede que um participante burle o
// cooldown recarregando a página. A chave inclui o roundId para que rodadas
// diferentes não compartilhem estado.

const cooldownKey = (roundId: string) => `es_cooldown_${roundId}`
const COOLDOWN_MS = 10_000  // 10 segundos — mesmo valor de COOLDOWN_SECONDS no hook

/**
 * Salva o timestamp do último envio para esta rodada.
 * Chamado imediatamente após uma submissão bem-sucedida.
 */
export function salvarCooldown(roundId: string): void {
  try { localStorage.setItem(cooldownKey(roundId), String(Date.now())) } catch {}
}

/**
 * Retorna os segundos restantes de cooldown para esta rodada.
 * Retorna 0 se o cooldown já expirou ou não há registro.
 */
export function getCooldownRestante(roundId: string): number {
  try {
    const raw = localStorage.getItem(cooldownKey(roundId))
    if (!raw) return 0
    const ts = parseInt(raw, 10)
    if (isNaN(ts)) return 0
    return Math.max(0, Math.ceil((ts + COOLDOWN_MS - Date.now()) / 1000))
  } catch {
    return 0
  }
}

