<script setup>
// Detalle de una categoría: sus galardonados (filtrados por la relación
// `category`) con filtro de texto y paginación.

const route = useRoute()
const slug = String(route.params.key)

const { data: cat } = await useCometEntry('categories', slug)

if (!cat.value) {
  throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada', fatal: true })
}

// `filter[category]` compara contra el *slug* de la entrada relacionada
// (no contra su id, aunque la relación almacene el id internamente).
const { data: rawRecords } = await useCometList('laureates', {
  'filter[category]': slug,
  include: 'category',
})

const records = computed(() =>
  [...(rawRecords.value || [])].sort(
    (a, b) => Number(b.year) - Number(a.year) || String(a.slug).localeCompare(String(b.slug)),
  ),
)

useHead({ title: `${cat.value.name} · Premios Nobel` })

const search = ref('')
const page = ref(1)
const perPage = 24

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return records.value
  return records.value.filter((r) => String(r.laureate || '').toLowerCase().includes(q))
})

watch([search], () => {
  page.value = 1
})

const paged = computed(() => {
  const start = (page.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

const yearsRange = computed(() => {
  const arr = records.value.map((r) => Number(r.year)).filter(Boolean)
  return arr.length ? `${Math.min(...arr)} – ${Math.max(...arr)}` : '—'
})

function accentBg(color) {
  return `linear-gradient(120deg, ${color}26, #ffffff 72%)`
}
</script>

<template>
  <div v-if="cat">
    <nav class="breadcrumb" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink>
      <span class="sep">/</span>
      <NuxtLink to="/categories">Categorías</NuxtLink>
      <span class="sep">/</span>
      <span>{{ cat.name }}</span>
    </nav>

    <!-- Encabezado de categoría -->
    <section class="detail-hero" :style="{ '--catcolor': cat.color, background: accentBg(cat.color) }">
      <p class="eyebrow">{{ cat.fullname }}</p>
      <h1 class="detail-name">{{ cat.name }}</h1>
      <p class="detail-sub mb-0">{{ cat.description }}</p>
      <div class="detail-meta">
        <div class="meta-item">
          <span class="mi-label">Premios</span>
          <span class="mi-value">{{ (records?.length || 0).toLocaleString('es') }}</span>
        </div>
        <div class="meta-item">
          <span class="mi-label">Primera ceremonia</span>
          <span class="mi-value">{{ yearsRange.split(' – ')[0] }}</span>
        </div>
        <div class="meta-item">
          <span class="mi-label">Última ceremonia</span>
          <span class="mi-value">{{ yearsRange.split(' – ')[1] }}</span>
        </div>
      </div>
    </section>

    <!-- Listado de galardonados de la categoría -->
    <div class="section-title">
      <div>
        <p class="eyebrow">Galardonados</p>
        <h2>Premios de {{ cat.name }}</h2>
      </div>
    </div>

    <div class="toolbar" style="grid-template-columns: 1fr auto">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" stroke-linecap="round" />
        </svg>
        <input v-model="search" type="search" placeholder="Filtrar por nombre en esta categoría…" />
      </div>
    </div>

    <p class="result-meta">
      <span>Mostrando <strong>{{ filtered.length.toLocaleString('es') }}</strong> premios · del más reciente al más antiguo</span>
    </p>

    <div v-if="paged.length" class="card-grid">
      <LaureateCard v-for="r in paged" :key="r.id" :record="r" />
    </div>

    <div v-else class="empty">
      <h3>Sin coincidencias</h3>
      <p>No hay premios de {{ cat.name }} que coincidan con el filtro.</p>
    </div>

    <PaginationView v-model="page" :total="filtered.length" :per-page="perPage" />
  </div>
</template>
