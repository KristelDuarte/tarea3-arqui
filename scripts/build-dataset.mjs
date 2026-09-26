/**
 * build-dataset.mjs
 * -----------------
 * Descarga los datos oficiales de los Premios Nobel (api.nobelprize.org/2.1)
 * y genera:
 *   - content/nobel.csv            : dataset tabular, una fila por premio concedido
 *   - content/categories/*.json    : un archivo por categoría (colección "data")
 *
 * Uso:  node scripts/build-dataset.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const API = 'https://api.nobelprize.org/2.1/laureates'

async function fetchAllLaureates() {
  const all = []
  let offset = 0
  const PAGE = 1000
  for (;;) {
    const res = await fetch(`${API}?limit=${PAGE}&offset=${offset}`)
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const data = await res.json()
    all.push(...data.laureates)
    if (data.laureates.length < PAGE) break
    offset += PAGE
  }
  return all
}

// mapeo del nombre oficial de la categoría a una clave estable
const CATEGORY_KEY = {
  Physics: 'physics',
  Chemistry: 'chemistry',
  'Physiology or Medicine': 'medicine',
  Medicine: 'medicine',
  Literature: 'literature',
  Peace: 'peace',
  'Economic Sciences': 'economic',
}

function txt(obj) {
  if (!obj) return ''
  return (obj.en || obj.se || '').toString().trim()
}

function esc(value) {
  const v = value === null || value === undefined ? '' : String(value).replace(/\s+/g, ' ').trim()
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

const CATEGORIES = {
  physics: {
    key: 'physics',
    name: 'Física',
    fullname: 'Premio Nobel de Física',
    ordinal: 1,
    color: '#1f6feb',
    icon: 'atom',
    description:
      'Reconoce descubrimientos e inventos sobresalientes en el campo de la física, desde la radiactividad y la mecánica cuántica hasta la cosmología y las partículas elementales.',
  },
  chemistry: {
    key: 'chemistry',
    name: 'Química',
    fullname: 'Premio Nobel de Química',
    ordinal: 2,
    color: '#9f4f2f',
    icon: 'flask',
    description:
      'Otorgado por contribuciones fundamentales a la química, como la tabla periódica, la polimerización, la estructura del ADN y los métodos de la química moderna.',
  },
  medicine: {
    key: 'medicine',
    name: 'Medicina',
    fullname: 'Premio Nobel de Fisiología o Medicina',
    ordinal: 3,
    color: '#2f9e6e',
    icon: 'heart',
    description:
      'Premia los logros más relevantes en fisiología y medicina: desde la insulina y los antibióticos hasta el desciframiento del genoma y la inmunoterapia.',
  },
  literature: {
    key: 'literature',
    name: 'Literatura',
    fullname: 'Premio Nobel de Literatura',
    ordinal: 4,
    color: '#b8860b',
    icon: 'quill',
    description:
      'Distingue la obra literaria más destacada producida en dirección ideal, reconociendo a poetas, novelistas, dramaturgos y ensayistas de todo el mundo.',
  },
  peace: {
    key: 'peace',
    name: 'Paz',
    fullname: 'Premio Nobel de la Paz',
    ordinal: 5,
    color: '#c0392b',
    icon: 'dove',
    description:
      'Honra a personas y organizaciones que han trabajado por la fraternidad entre las naciones, la abolición de los ejércitos y la celebración de congresos de paz.',
  },
  economic: {
    key: 'economic',
    name: 'Ciencias Económicas',
    fullname: 'Premio de Ciencias Económicas en memoria de Alfred Nobel',
    ordinal: 6,
    color: '#5b6ee1',
    icon: 'scale',
    description:
      'Instituido en 1968 por el Sveriges Riksbank en memoria de Alfred Nobel, reconoce investigaciones económicas de importancia excepcional.',
  },
}

async function main() {
  const laureates = await fetchAllLaureates()
  console.log(`Galardonados descargados: ${laureates.length}`)

  const rows = []
  let id = 1

  for (const l of laureates) {
    const prizes = (l.nobelPrizes || []).filter((p) => p.prizeStatus === 'received')
    if (!prizes.length) continue

    // En la API las organizaciones no traen gender y su nombre vive en orgName
    const isOrg = Boolean(l.orgName?.en) || !l.gender
    const fullName = txt(l.fullName) || txt(l.knownName) || txt(l.orgName)
    const gender = isOrg ? 'org' : l.gender || ''
    const birth = l.birth || {}
    const birthPlace = txt(birth.place && birth.place.locationString)
    const birthCountry = txt(birth.place && birth.place.country)
    const birthDate = birth.date || ''
    const deathDate = txt(l.death && l.death.date) || ''

    for (const p of prizes) {
      const categoryEn = txt(p.category)
      const key = CATEGORY_KEY[categoryEn] || categoryEn.toLowerCase()
      const affiliation = (p.affiliations && p.affiliations.length
        ? txt(p.affiliations[0].nameNow) || txt(p.affiliations[0].name)
        : '') || ''
      const motivation = txt(p.motivation)

      rows.push({
        id: id++,
        laureate: fullName,
        gender,
        year: Number(p.awardYear),
        category: key,
        motivation,
        affiliation,
        birth_date: birthDate,
        birth_place: birthPlace,
        birth_country: birthCountry,
        death_date: deathDate,
      })
    }
  }

  // Orden estable: por año ascendente y, dentro del año, por categoría
  rows.sort((a, b) => a.year - b.year || (CATEGORIES[a.category]?.ordinal || 99) - (CATEGORIES[b.category]?.ordinal || 99))

  const header = ['id', 'laureate', 'gender', 'year', 'category', 'motivation', 'affiliation', 'birth_date', 'birth_place', 'birth_country', 'death_date']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(header.map((h) => esc(r[h])).join(','))
  }

  const csvPath = join(ROOT, 'content', 'nobel.csv')
  writeFileSync(csvPath, lines.join('\r\n') + '\r\n', 'utf8')
  console.log(`CSV generado: ${csvPath}  (${rows.length} registros)`)

  // Generar un archivo JSON por categoría
  const catDir = join(ROOT, 'content', 'categories')
  if (!existsSync(catDir)) mkdirSync(catDir, { recursive: true })
  for (const cat of Object.values(CATEGORIES)) {
    const count = rows.filter((r) => r.category === cat.key).length
    const data = { ...cat, count }
    writeFileSync(join(catDir, `${cat.key}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8')
  }
  console.log(`Categorías generadas en: ${catDir}`)

  // Resumen estadístico
  const summary = {}
  for (const r of rows) {
    summary[r.category] = (summary[r.category] || 0) + 1
  }
  console.log('Registros por categoría:', summary)
  console.log('Rango de años:', Math.min(...rows.map((r) => r.year)), '-', Math.max(...rows.map((r) => r.year)))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
