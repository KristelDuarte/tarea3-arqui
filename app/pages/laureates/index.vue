<script setup>
useHead({ title: 'Galardonados · Premios Nobel' })

// Se traen todos los galardonados con su categoría ya expandida.
const { data: rows } = await useCometList('laureates', { include: 'category' })
const { data: cats } = await useCometList('categories')

const categories = computed(() =>
  [...(cats.value || [])].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)),
)

const q = ref('')
const category = ref('todas')
const gender = ref('todos')
const page = ref(1)
const perPage = 24

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (rows.value || []).filter((r) => {
    if (category.value !== 'todas' && r.category?.slug !== category.value) return false
    if (gender.value !== 'todos' && r.gender !== gender.value) return false
    if (!term) return true
    const haystack = [r.laureate, r.motivation, r.affiliation, r.birth_country, String(r.year)]
      .filter(Boolean)
      .join(' | ')
      .toLowerCase()
    return haystack.includes(term)
  })
})

watch([q, category, gender], () => {
  page.value = 1
})

const paged = computed(() => {
  const start = (page.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

const total = computed(() => filtered.value.length)

function clearFilters() {
  q.value = ''
  category.value = 'todas'
  gender.value = 'todos'
}
</script>

<template>
  <div>
    <div class="section-title">
      <div>
        <p class="eyebrow">Dataset completo</p>
        <h2>Buscar galardonados</h2>
        <p class="lead mb-0">
          Encuentra cualquier premio del dataset por nombre, país, institución o
          motivación; filtra por categoría o género y recorre los resultados con
          paginación.
        </p>
      </div>
    </div>

    <!-- Herramientas de búsqueda -->
    <div class="toolbar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" stroke-linecap="round" />
        </svg>
        <input
          v-model="q"
          type="search"
          placeholder="Buscar por nombre, p. ej. «Curie» o «Röntgen»…"
          aria-label="Buscar galardonados"
        />
      </div>

      <div class="field">
        <select v-model="category" aria-label="Filtrar por categoría">
          <option value="todas">Todas las categorías</option>
          <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name }}</option>
        </select>
      </div>

      <div class="field">
        <select v-model="gender" aria-label="Filtrar por género">
          <option value="todos">Todos (personas y org.)</option>
          <option value="male">Hombre</option>
          <option value="female">Mujer</option>
          <option value="org">Organización</option>
        </select>
      </div>
    </div>

    <p class="result-meta">
      <span>
        <strong>{{ total.toLocaleString('es') }}</strong>
        {{ total === 1 ? 'resultado' : 'resultados' }} · ordenados del más reciente al más antiguo
      </span>
      <button
        v-if="q || category !== 'todas' || gender !== 'todos'"
        type="button"
        class="btn btn-ghost btn-sm"
        @click="clearFilters"
      >
        Limpiar filtros
      </button>
    </p>

    <div v-if="paged.length" class="card-grid">
      <LaureateCard v-for="r in paged" :key="r.id" :record="r" />
    </div>

    <div v-else class="empty">
      <h3>Sin resultados</h3>
      <p>
        Ningún galardonado coincide con «{{ q }}» y los filtros seleccionados.
        Prueba con otro nombre o quita algún filtro.
      </p>
      <button type="button" class="btn btn-sm mt-2" @click="clearFilters">Mostrar todo el dataset</button>
    </div>

    <PaginationView v-model="page" :total="total" :per-page="perPage" />
  </div>
</template>
