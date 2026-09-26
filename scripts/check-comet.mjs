/**
 * check-comet.mjs
 * ---------------
 * Diagnóstico de la configuración de Comet CMS. No requiere el panel de
 * administración: consulta la API pública y compara el resultado con lo que
 * espera el proyecto.
 *
 * Comprueba:
 *   1. Conexión con el CMS (resolviendo el challenge de cookie del hosting).
 *   2. Que existan los content types `categories` y `laureates` con los campos
 *      esperados (según docs/comet-cms.md).
 *   3. Cuántas entradas hay publicadas en cada colección.
 *   4. Que el token de `.env` (si lo hay) sea válido.
 *
 * Uso:
 *   node scripts/check-comet.mjs      # o  npm run cms:check
 */

import { readFileSync, existsSync } from 'node:fs'
import { createDecipheriv } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadDotEnv() {
  const file = join(ROOT, '.env')
  if (!existsSync(file)) return
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadDotEnv()

const BASE_URL = (process.env.NUXT_COMET_URL || '').replace(/\/+$/, '')
const WORKSPACE = process.env.NUXT_COMET_WORKSPACE || 'default'
const READ_TOKEN = process.env.NUXT_COMET_API_TOKEN || ''

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// Campos que el front-end espera en cada content type.
const EXPECTED = {
  categories: ['name', 'fullname', 'ordinal', 'color', 'icon', 'description'],
  laureates: [
    'laureate', 'gender', 'year', 'category', 'motivation', 'affiliation',
    'birth_date', 'birth_place', 'birth_country', 'death_date', 'photo',
  ],
}

const ok = (msg) => console.log(`  ✔ ${msg}`)
const bad = (msg) => console.log(`  ✗ ${msg}`)
const warn = (msg) => console.log(`  ⚠ ${msg}`)

// --------------------------------------------------------------------------
// Cliente HTTP (resuelve el challenge de cookie del hosting)
// --------------------------------------------------------------------------

let cookie = null

function solveChallenge(html) {
  const m = html.match(
    /a=toNumbers\("([0-9a-f]+)"\),\s*b=toNumbers\("([0-9a-f]+)"\),\s*c=toNumbers\("([0-9a-f]+)"\)/,
  )
  if (!m) return null
  try {
    const d = createDecipheriv('aes-128-cbc', Buffer.from(m[1], 'hex'), Buffer.from(m[2], 'hex'))
    d.setAutoPadding(false)
    return Buffer.concat([d.update(Buffer.from(m[3], 'hex')), d.final()]).toString('hex')
  } catch {
    return null
  }
}

async function get(path, token) {
  const headers = { 'User-Agent': UA, Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (cookie) headers.Cookie = `__test=${cookie}`

  let response = await fetch(`${BASE_URL}${path}`, { headers })
  if ((response.headers.get('content-type') || '').includes('text/html')) {
    const html = await response.text()
    const value = solveChallenge(html)
    if (!value) return { status: response.status, body: null }
    cookie = value
    headers.Cookie = `__test=${value}`
    response = await fetch(`${BASE_URL}${path}`, { headers })
  }

  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  return { status: response.status, body }
}

// --------------------------------------------------------------------------

if (!BASE_URL) {
  console.error('✗ Falta NUXT_COMET_URL en .env')
  process.exit(1)
}

console.log(`\nComet CMS · ${BASE_URL}  ·  workspace: ${WORKSPACE}\n`)
const prefix = `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}`

let failures = 0

// 1. Conexión
const health = await get('/api/v1/workspaces/default/health')
if (health.status === 200 && health.body?.data?.ok) {
  ok(`Conexión con CometCMS ${health.body.data.version}`)
} else {
  bad(`No se pudo conectar con el CMS (${health.status})`)
  failures++
}

// 2. Content types
console.log('\nContent types:')
const types = await get(`${prefix}/content-types`)
const byName = new Map(
  (Array.isArray(types.body?.data) ? types.body.data : []).map((t) => [t.name, t]),
)

if (byName.size === 0) {
  bad('No se listó ningún content type. ¿Están creados en el panel?')
  failures++
}

for (const [name, expectedFields] of Object.entries(EXPECTED)) {
  const type = byName.get(name)
  if (!type) {
    bad(`Falta el content type "${name}"`)
    failures++
    continue
  }
  const fieldKeys = Object.keys(type.fields || {})
  const missing = expectedFields.filter((f) => !fieldKeys.includes(f))
  const relation = type.fields?.category
  if (missing.length === 0) {
    ok(`"${name}" con todos los campos esperados`)
  } else {
    bad(`"${name}": faltan campos → ${missing.join(', ')}`)
    failures++
  }
  if (name === 'laureates') {
    if (relation?.type === 'relation' && relation?.target === 'categories') {
      ok('Relación laureates.category → categories')
    } else {
      bad('El campo "category" debe ser de tipo relation con target "categories"')
      failures++
    }
    // `options` puede venir como array (['male', ...]) o como objeto ({male: 'Hombre', ...}).
    const rawOptions = type.fields?.gender?.options
    const options = Array.isArray(rawOptions)
      ? rawOptions.map((o) => (typeof o === 'string' ? o : o?.value))
      : rawOptions && typeof rawOptions === 'object'
        ? Object.keys(rawOptions)
        : []
    const missingOptions = ['male', 'female', 'org'].filter((v) => !options.includes(v))
    if (missingOptions.length === 0) {
      ok(`Opciones de "gender": ${options.join(', ')}`)
    } else {
      bad(`Al desplegable "gender" le faltan opciones: ${missingOptions.join(', ')}`)
      failures++
    }
  }
}

// 3. Entradas
console.log('\nEntradas publicadas:')
const counts = {}
for (const collection of Object.keys(EXPECTED)) {
  const res = await get(`${prefix}/content/${collection}`)
  const total = res.body?.meta?.total
  counts[collection] = total ?? 0
  if (res.status === 200) {
    if (total > 0) ok(`${collection}: ${total} entradas`)
    else warn(`${collection}: 0 entradas (el sitio se verá vacío)`)
  } else {
    bad(`${collection}: ${res.status} ${res.body?.error?.message || ''}`)
    failures++
  }
}

// 4. Token de lectura
console.log('\nToken de lectura:')
if (!/^ctcms_[A-Za-z0-9]/.test(READ_TOKEN)) {
  warn('NUXT_COMET_API_TOKEN vacío. En v1.0.1 la lectura pública no lo necesita.')
} else {
  const res = await get(`${prefix}/content/categories`, READ_TOKEN)
  if (res.status === 200) ok('El token es válido y puede leer contenido')
  else {
    bad(`El token fue rechazado (${res.status}: ${res.body?.error?.message || 'error'})`)
    failures++
  }
}

// Veredicto
console.log('')
if (failures === 0) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  console.log(
    total > 0
      ? '✔ Todo listo: la configuración es correcta y hay contenido para mostrar.\n'
      : '✔ Configuración correcta. Falta cargar contenido (usa el panel o `npm run cms:import`).\n',
  )
} else {
  console.log(`✗ Se encontraron ${failures} problema(s). Revisa docs/comet-cms.md.\n`)
  process.exitCode = 1
}
