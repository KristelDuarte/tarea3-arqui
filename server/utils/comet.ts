import { createDecipheriv } from 'node:crypto'

/**
 * Cliente HTTP hacia Comet CMS.
 * ----------------------------
 * El hosting de `cms-una.gt.tc` protege todas las peticiones con un "challenge"
 * de cookie (`aes.js` / `__test`): la primera petición sin cookie devuelve una
 * página HTML que, resolviéndola, entrega una cookie válida durante ~6 horas.
 *
 * `cometFetch()` resuelve ese challenge automáticamente y guarda la cookie en
 * caché para el resto del proceso, de modo que el resto del código puede hacer
 * peticiones normales y recibir JSON.
 */

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

let challengeCache: { origin: string; cookie: string; expiresAt: number } | null = null

/** Extrae la cookie `__test` a partir del HTML del challenge (AES-128-CBC). */
function solveChallengeCookie(html: string): string | null {
  const match = html.match(
    /a=toNumbers\("([0-9a-f]+)"\),\s*b=toNumbers\("([0-9a-f]+)"\),\s*c=toNumbers\("([0-9a-f]+)"\)/,
  )
  if (!match) return null

  const [, key, iv, payload] = match
  try {
    const decipher = createDecipheriv('aes-128-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'))
    decipher.setAutoPadding(false)
    const value = Buffer.concat([
      decipher.update(Buffer.from(payload, 'hex')),
      decipher.final(),
    ]).toString('hex')
    return value || null
  } catch {
    return null
  }
}

async function requestChallengeCookie(origin: string): Promise<string | null> {
  const res = await fetch(`${origin}/`, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
  })
  const cookie = solveChallengeCookie(await res.text())
  if (cookie) {
    challengeCache = { origin, cookie, expiresAt: Date.now() + 5 * 60 * 60 * 1000 }
  }
  return cookie
}

export interface CometFetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
}

/**
 * Un token de Comet comienza con `ctcms_`. Si no lo parece, se ignora en vez
 * de enviarlo: enviar un token inválido hace que el CMS responda `401` incluso
 * en lecturas públicas.
 */
export function isCometToken(value: unknown): boolean {
  return typeof value === 'string' && /^ctcms_[A-Za-z0-9]/.test(value.trim())
}

/** Cabeceras de autenticación (sólo si hay un token con pinta válida). */
export function cometAuthHeaders(token: unknown): Record<string, string> {
  return isCometToken(token) ? { Authorization: `Bearer ${String(token).trim()}` } : {}
}

/**
 * Códigos con los que el hosting compartido indica saturación
 * (508 = "Resource Limit Is Reached").
 */
const RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 508])

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * `fetch()` que atraviesa el challenge de cookie del hosting y reintenta con
 * espera creciente cuando el hosting responde que está saturado.
 */
export async function cometFetch(url: string, options: CometFetchOptions = {}): Promise<Response> {
  const origin = new URL(url).origin
  const headers: Record<string, string> = { 'User-Agent': BROWSER_UA, ...(options.headers || {}) }
  const MAX_ATTEMPTS = 5

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (
      challengeCache &&
      challengeCache.origin === origin &&
      challengeCache.expiresAt > Date.now()
    ) {
      headers.Cookie = `__test=${challengeCache.cookie}`
    }

    let response = await fetch(url, { ...options, headers })

    // Si el hosting devuelve el HTML del challenge, se resuelve y se reintenta.
    if ((response.headers.get('content-type') || '').includes('text/html')) {
      const html = await response.text()
      const cookie = solveChallengeCookie(html) ?? (await requestChallengeCookie(origin))
      response = cookie
        ? await fetch(url, { ...options, headers: { ...headers, Cookie: `__test=${cookie}` } })
        : new Response(html, { status: response.status, headers: response.headers })
    }

    // 508 (o HTML en un endpoint que debería ser JSON) significa saturación.
    const retryable =
      RETRY_STATUSES.has(response.status) ||
      (response.headers.get('content-type') || '').includes('text/html')

    if (!retryable || attempt === MAX_ATTEMPTS) return response

    await sleep(600 * attempt)
  }

  throw new Error('cometFetch: no se pudo completar la petición')
}

/** Lee una colección completa de Comet CMS (omite `limit` para traer todo). */
export async function cometReadAll<T = any>(
  baseUrl: string,
  workspace: string,
  collection: string,
  token: string,
): Promise<T[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/workspaces/${encodeURIComponent(
    workspace,
  )}/content/${collection}`
  const response = await cometFetch(url, {
    headers: { Accept: 'application/json', ...cometAuthHeaders(token) },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const payload: any = await response.json()
  return Array.isArray(payload?.data) ? payload.data : []
}
