import { cometAuthHeaders, cometFetch } from '../../utils/comet'

/**
 * Proxy hacia Comet CMS — `server/api/comet/[...path].ts`
 * -------------------------------------------------------
 * El navegador NUNCA ve el token: cada página llama a esta ruta de Nitro y
 * es el servidor de Nuxt el que reenvía la petición a Comet CMS agregando el
 * encabezado `Authorization: Bearer ...`.
 *
 * Se conservan tal cual los parámetros de consulta que usa Comet:
 *   filter[campo]=valor, filter[campo][contains]=..., include=a,b,
 *   sort=-campo, limit, offset, q, locale.
 *
 * Ejemplo: GET /api/comet/content/laureates?include=category
 *   -> GET {cometUrl}/api/v1/workspaces/{workspace}/content/laureates?include=category
 */
interface CacheEntry {
  expiresAt: number
  payload: any
}

/**
 * Caché en memoria + deduplicación de peticiones en vuelo.
 *
 * El hosting de Comet es gratuito y limita los recursos (responde 508 si recibe
 * muchas peticiones seguidas). Al generar el sitio, varias páginas piden los
 * mismos datos, así que esta caché baja las llamadas al CMS de ~80 a ~30.
 */
const responseCache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<any>>()
const CACHE_TTL = import.meta.dev ? 15_000 : 5 * 60 * 1000

export default defineEventHandler(async (event) => {
  const path = (getRouterParam(event, 'path') || '').replace(/^\/+/, '')

  // Sólo rutas de contenido/medios: se descartan intentos de salir del ámbito.
  if (!path || !/^[A-Za-z0-9_-][A-Za-z0-9_\-/]*$/.test(path) || path.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Ruta de Comet CMS inválida' })
  }

  const config = useRuntimeConfig()
  const baseUrl = String(config.cometUrl || '').replace(/\/+$/, '')
  const workspace = String(config.cometWorkspace || 'default')

  if (!baseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Falta configurar NUXT_COMET_URL (runtimeConfig.cometUrl)',
    })
  }

  // Se reenvía la query original sin reinterpretarla (respeta filter[...] etc.).
  const search = getRequestURL(event).search
  const cacheKey = `${path}${search}`

  const cached = responseCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.payload

  const pending = inFlight.get(cacheKey)
  if (pending) return pending

  const task = (async () => {
    const target = `${baseUrl}/api/v1/workspaces/${encodeURIComponent(workspace)}/${cacheKey}`
    const response = await cometFetch(target, {
      headers: {
        Accept: 'application/json',
        ...cometAuthHeaders(config.cometApiToken),
      },
    })

    const text = await response.text()
    let payload: any = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }

    if (payload === null) {
      console.warn(
        `[comet] respuesta no JSON para "${cacheKey}" → ${response.status} ${String(text)
          .slice(0, 120)
          .replace(/\s+/g, ' ')}`,
      )
      throw createError({
        statusCode: response.status === 200 ? 502 : response.status,
        statusMessage:
          response.status === 508
            ? 'El hosting del CMS alcanzó su límite de recursos (508); intenta de nuevo en unos minutos'
            : 'Comet CMS devolvió una respuesta no válida',
      })
    }

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage:
          payload?.error?.message || response.statusText || 'No se pudo consultar Comet CMS',
        data: payload,
      })
    }

    return payload
  })()

  inFlight.set(cacheKey, task)
  try {
    const payload = await task
    responseCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL, payload })
    return payload
  } finally {
    inFlight.delete(cacheKey)
  }
})
