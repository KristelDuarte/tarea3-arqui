/**
 * import-to-comet.mjs
 * -------------------
 * Carga el dataset del Proyecto 1 (content/nobel.csv y content/categories/*.json)
 * en Comet CMS a través de su API REST pública.
 *
 * Antes de ejecutarlo, en el panel de Comet CMS deben existir los content types
 * `categories` y `laureates` (ver docs/comet-cms.md).
 *
 * Variables de entorno (se leen de `.env` si el archivo existe):
 *   NUXT_COMET_URL         URL base del CMS      (p. ej. https://cms-una.gt.tc)
 *   NUXT_COMET_WORKSPACE   slug del workspace    (p. ej. premios-nobel)
 *   COMET_IMPORT_TOKEN     token ctcms_... con content.read/create/update/publish
 *                          (si no se define, se usa NUXT_COMET_API_TOKEN)
 *
 * Uso:
 *   node scripts/import-to-comet.mjs                 # importa todo
 *   node scripts/import-to-comet.mjs --limit=40      # sólo los primeros 40 galardonados
 *   node scripts/import-to-comet.mjs --update        # actualiza entradas ya existentes
 *   node scripts/import-to-comet.mjs --dry-run       # muestra lo que haría, sin escribir
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { createDecipheriv } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// --------------------------------------------------------------------------
// Configuración
// --------------------------------------------------------------------------

function loadDotEnv() {
  const file = join(ROOT, '.env')
  if (!existsSync(file)) return
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
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

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const option = (name) => {
  const prefix = `--${name}=`
  const found = argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : null
}

const DRY_RUN = flag('dry-run')
const UPDATE = flag('update')
const LIMIT = option('limit') ? Number(option('limit')) : null

const URL_BASE = (process.env.NUXT_COMET_URL || '').replace(/\/+$/, '')
const WORKSPACE = process.env.NUXT_COMET_WORKSPACE || 'default'
const TOKEN = process.env.COMET_IMPORT_TOKEN || process.env.NUXT_COMET_API_TOKEN || ''

if (flag('help') || flag('h')) {
  console.log('Uso: node scripts/import-to-comet.mjs [--limit=N] [--update] [--dry-run]')
  process.exit(0)
}

if (!URL_BASE || !TOKEN) {
  console.error(
    '\n✗ Faltan NUXT_COMET_URL y/o COMET_IMPORT_TOKEN (o NUXT_COMET_API_TOKEN).\n' +
      '  Copia .env.example a .env y completa los valores. Ver docs/comet-cms.md.\n',
  )
  process.exit(1)
}

const CONTENT_BASE = `${URL_BASE}/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/content`

// --------------------------------------------------------------------------
// Cliente HTTP
// El hosting de Comet CMS protege las peticiones con un challenge de cookie
// (`aes.js` / `__test`); aquí se resuelve automáticamente.
// --------------------------------------------------------------------------

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

let challengeCookie = null

function solveChallengeCookie(html) {
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

async function cometFetch(url, options = {}) {
  const headers = { 'User-Agent': BROWSER_UA, ...(options.headers || {}) }
  if (challengeCookie) headers.Cookie = `__test=${challengeCookie}`

  let response = await fetch(url, { ...options, headers })
  if ((response.headers.get('content-type') || '').includes('text/html')) {
    const html = await response.text()
    const cookie = solveChallengeCookie(html)
    if (cookie) {
      challengeCookie = cookie
      headers.Cookie = `__test=${cookie}`
      response = await fetch(url, { ...options, headers })
    } else {
      return new Response(html, { status: response.status, headers: response.headers })
    }
  }
  return response
}

async function api(path, { method = 'GET', body } = {}) {
  const response = await cometFetch(`${CONTENT_BASE}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.error?.code || response.statusText || 'Error desconocido'
    const error = new Error(`${method} ${path} → ${response.status} ${message}`)
    error.status = response.status
    throw error
  }

  return payload
}

async function listAll(collection) {
  const payload = await api(`content/${collection}`)
  return Array.isArray(payload?.data) ? payload.data : []
}

async function create(collection, body, label) {
  if (DRY_RUN) {
    console.log(`  [dry-run] POST content/${collection}  →  ${label}`)
    return { id: `dry-${label}` }
  }
  const payload = await api(`content/${collection}`, { method: 'POST', body })
  console.log(`  + ${label}`)
  return payload?.data
}

async function update(collection, id, body, label) {
  if (DRY_RUN) {
    console.log(`  [dry-run] PUT  content/${collection}/${id}  →  ${label}`)
    return { id }
  }
  const payload = await api(`content/${collection}/${id}`, { method: 'PUT', body })
  console.log(`  ~ ${label}`)
  return payload?.data
}

// --------------------------------------------------------------------------
// Utilidades
// --------------------------------------------------------------------------

/** Elimina claves vacías: Comet valida los campos `date`/`number` si llegan vacíos. */
function compact(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[łŁ]/g, 'l')
    .replace(/[øØ]/g, 'o')
    .replace(/[đĐ]/g, 'd')
    .replace(/ß/g, 'ss')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

/** Parser CSV mínimo con soporte de comillas dobles y saltos dentro de comillas. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// --------------------------------------------------------------------------
// Importación
// --------------------------------------------------------------------------

async function importCategories() {
  console.log('\n▸ Categorías')
  const dir = join(ROOT, 'content', 'categories')
  const files = readdirSync(dir).filter((file) => file.endsWith('.json')).sort()

  const existing = new Map((await listAll('categories')).map((entry) => [entry.slug, entry]))
  const idByKey = new Map()

  for (const file of files) {
    const cat = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    const body = compact({
      slug: cat.key,
      status: 'published',
      title: cat.name,
      name: cat.name,
      fullname: cat.fullname,
      ordinal: cat.ordinal,
      color: cat.color,
      icon: cat.icon,
      description: cat.description,
    })
    const label = `categoría "${cat.key}"`
    const current = existing.get(cat.key)

    try {
      if (current && !UPDATE) {
        console.log(`  = ${label} ya existe (id ${current.id})`)
        idByKey.set(cat.key, current.id)
      } else if (current) {
        const saved = await update('categories', current.id, body, label)
        idByKey.set(cat.key, saved?.id || current.id)
      } else {
        const saved = await create('categories', body, label)
        if (saved?.id) idByKey.set(cat.key, saved.id)
      }
    } catch (error) {
      console.error(`  ✗ ${label}: ${error.message}`)
    }
  }

  return idByKey
}

async function importLaureates(idByKey) {
  console.log('\n▸ Galardonados')
  const csv = parseCsv(readFileSync(join(ROOT, 'content', 'nobel.csv'), 'utf8'))
  const header = csv.shift() || []
  const allRows = csv
    .map((values) => Object.fromEntries(header.map((key, i) => [key, values[i] ?? ''])))
    .filter((row) => row.laureate)

  const rows = LIMIT && LIMIT > 0 ? allRows.slice(0, LIMIT) : allRows
  console.log(`  ${rows.length} de ${allRows.length} registros del CSV`)

  const existing = new Map((await listAll('laureates')).map((entry) => [entry.slug, entry]))
  const usedSlugs = new Set(existing.keys())
  const uniqueSlug = (base) => {
    let slug = base || 'premio'
    let n = 2
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`
    usedSlugs.add(slug)
    return slug
  }

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    const base = `${slugify(row.laureate)}-${row.year}`
    const label = `${row.laureate} (${row.year})`
    const body = (slug) =>
      compact({
        slug,
        status: 'published',
        title: row.laureate,
        laureate: row.laureate,
        gender: row.gender,
        year: row.year ? Number(row.year) : undefined,
        category: idByKey.get(row.category),
        motivation: row.motivation,
        affiliation: row.affiliation,
        birth_date: row.birth_date,
        birth_place: row.birth_place,
        birth_country: row.birth_country,
        death_date: row.death_date,
      })

    try {
      const current = existing.get(base)
      if (current && !UPDATE) {
        skipped++
        continue
      }
      if (current) {
        await update('laureates', current.id, body(base), label)
        updated++
      } else {
        await create('laureates', body(uniqueSlug(base)), label)
        created++
      }
    } catch (error) {
      failed++
      console.error(`  ✗ ${label}: ${error.message}`)
    }
  }

  return { created, updated, skipped, failed }
}

async function main() {
  console.log(`Comet CMS: ${URL_BASE}  ·  workspace: ${WORKSPACE}${DRY_RUN ? '  ·  DRY RUN' : ''}`)

  const idByKey = await importCategories()
  if (idByKey.size === 0) {
    console.warn(
      '\n⚠ No se resolvió ninguna categoría. Revisa que el content type `categories`\n' +
        '  exista en el CMS y que el token tenga permiso content.create/read/publish.\n',
    )
  }

  const stats = await importLaureates(idByKey)

  console.log(
    `\n✔ Listo. Creados: ${stats.created} · Actualizados: ${stats.updated} · ` +
      `Omitidos: ${stats.skipped} · Errores: ${stats.failed}`,
  )
  if (stats.failed > 0) process.exitCode = 1
}

main().catch((error) => {
  if (error?.status === 404) {
    console.error(
      '\n✗ La colección no existe en Comet CMS (404).\n' +
        '  Crea primero los content types `categories` y `laureates` en el panel\n' +
        '  (Content types → New content type). Ver docs/comet-cms.md.\n',
    )
  } else {
    console.error(`\n✗ ${error?.message || error}\n`)
  }
  process.exit(1)
})
