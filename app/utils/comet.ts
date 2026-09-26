/**
 * Utilidades para consumir Comet CMS desde las páginas.
 * ----------------------------------------------------
 * La API pública de Comet devuelve cada entrada así:
 *
 *   {
 *     id, slug, type, status, title, published_at, created_at, updated_at,
 *     data: { ...campos definidos en el content type }   // <-- ¡anidados!
 *   }
 *
 * Además, al pedir `?include=campo` un campo de tipo `relation` se reemplaza
 * por la entrada relacionada completa (que a su vez trae su propio `data`).
 *
 * `normalizeCometEntry` "aplana" esa estructura para que las plantillas puedan
 * escribir `r.category.slug` en lugar de `r.data.category.data.slug`.
 */

function isCometEntry(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).id === 'string' &&
    'data' in (value as Record<string, unknown>)
  )
}

export function normalizeCometEntry(entry: any): any {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null

  const flat: Record<string, any> = {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    status: entry.status,
    publishedAt: entry.published_at ?? null,
  }

  if (entry.data && typeof entry.data === 'object') {
    Object.assign(flat, entry.data)
  }

  // Expande recursivamente las relaciones (y arreglos de relaciones).
  for (const key of Object.keys(flat)) {
    const value = flat[key]
    if (Array.isArray(value)) {
      flat[key] = value.map((item) => (isCometEntry(item) ? normalizeCometEntry(item) : item))
    } else if (isCometEntry(value)) {
      flat[key] = normalizeCometEntry(value)
    }
  }

  return flat
}

export function normalizeCometList(payload: any): any[] {
  if (Array.isArray(payload?.data)) return payload.data.map(normalizeCometEntry)
  if (isCometEntry(payload?.data)) return [normalizeCometEntry(payload.data)]
  return []
}

/**
 * Lee una colección completa desde el proxy de Nuxt.
 * `limit` se omite a propósito: Comet devuelve todas las entradas.
 */
export function useCometList(collection: string, query: Record<string, any> = {}) {
  const key = `comet:${collection}:${JSON.stringify(query)}`
  return useAsyncData(
    key,
    async () => {
      const payload = await $fetch(`/api/comet/content/${collection}`, { query })
      return normalizeCometList(payload)
    },
    { default: () => [] as any[] },
  )
}

/** Lee una entrada por `slug` o `id`. */
export function useCometEntry(
  collection: string,
  identifier: string,
  query: Record<string, any> = {},
) {
  const key = `comet:${collection}:${identifier}:${JSON.stringify(query)}`
  return useAsyncData(
    key,
    async () => {
      const payload = await $fetch(
        `/api/comet/content/${collection}/${encodeURIComponent(identifier)}`,
        { query },
      )
      return normalizeCometEntry(payload?.data)
    },
    { default: () => null as any },
  )
}
