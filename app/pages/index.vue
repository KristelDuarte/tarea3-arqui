<script setup>
useHead({ title: 'Inicio · Premios Nobel' })

// Todo el contenido proviene de Comet CMS (a través del proxy /api/comet/...).
const { data: cats } = await useCometList('categories')
const { data: laureates } = await useCometList('laureates', { include: 'category' })

const categories = computed(() =>
  [...(cats.value || [])].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)),
)

const stats = computed(() => {
  const rows = laureates.value || []
  const yearsArr = [...new Set(rows.map((r) => Number(r.year)).filter(Boolean))].sort(
    (a, b) => a - b,
  )
  const countries = new Set(rows.map((r) => r.birth_country).filter(Boolean))
  return {
    records: rows.length,
    categories: new Set(rows.map((r) => r.category?.slug).filter(Boolean)).size,
    years: yearsArr.length,
    countries: countries.size,
    firstYear: yearsArr[0] || 1901,
    lastYear: yearsArr[yearsArr.length - 1] || 2025,
  }
})

const latest = computed(() =>
  [...(laureates.value || [])]
    .sort(
      (a, b) => Number(b.year) - Number(a.year) || String(b.slug).localeCompare(String(a.slug)),
    )
    .slice(0, 8),
)

const schemaCards = computed(() => [
  {
    icon: 'medal',
    tint: 'rgba(184,134,11,0.14)',
    title: 'Por categoría',
    text: 'Esquema temático: seis disciplinas premiadas desde 1901. Cada categoría reúne a sus galardonados.',
    to: '/categories',
    cta: 'Ver las 6 categorías',
    items: categories.value.map((c) => c.name),
  },
  {
    icon: 'calendar',
    tint: 'rgba(19,49,92,0.10)',
    title: 'Por año',
    text: 'Esquema cronológico exacto: recorre las ceremonias de 1901 a 2025, agrupadas por décadas.',
    to: '/years',
    cta: 'Explorar los años',
    items: [`${stats.value.firstYear} → ${stats.value.lastYear}`, 'Ceremonias agrupadas por década'],
  },
  {
    icon: 'search',
    tint: 'rgba(31,111,235,0.10)',
    title: 'Buscar y filtrar',
    text: 'Encuentra cualquier galardonado por nombre, país o motivación, con filtros y paginación sobre el dataset completo.',
    to: '/laureates',
    cta: 'Ir al buscador',
    items: ['Búsqueda de texto libre', 'Filtros por categoría y género', 'Paginación de resultados'],
  },
])
</script>

<template>
  <div>
    <!-- Portada -->
    <section class="hero">
      <p class="hero-kicker">Proyecto · Arquitectura de Información · Dataset Nobel</p>
      <h1>Los Premios Nobel, de 1901 a 2025</h1>
      <p class="lead">
        Más de mil registros —cada premio concedido por la Fundación Nobel— en un
        catálogo que puedes recorrer por categoría, por año o mediante búsqueda y
        paginación.
      </p>
      <div class="hero-actions">
        <NuxtLink to="/categories" class="btn">Explorar por categoría</NuxtLink>
        <NuxtLink to="/laureates" class="btn btn-outline-light">Buscar galardonados</NuxtLink>
      </div>

      <div class="stat-band" role="list">
        <div class="stat" role="listitem">
          <strong>{{ stats.records.toLocaleString('es') }}</strong>
          <span>premios registrados</span>
        </div>
        <div class="stat" role="listitem">
          <strong>{{ stats.categories }}</strong>
          <span>categorías</span>
        </div>
        <div class="stat" role="listitem">
          <strong>{{ stats.years }}</strong>
          <span>años con ceremonia</span>
        </div>
        <div class="stat" role="listitem">
          <strong>{{ stats.countries.toLocaleString('es') }}</strong>
          <span>países</span>
        </div>
      </div>
    </section>

    <!-- Caminos de navegación -->
    <div class="section-title">
      <div>
        <p class="eyebrow">Formas de explorar</p>
        <h2>Elige tu camino por los datos</h2>
      </div>
    </div>

    <div class="schema-cards">
      <NuxtLink
        v-for="card in schemaCards"
        :key="card.title"
        :to="card.to"
        class="schema-card"
      >
        <span class="sc-icon" :style="{ background: card.tint, color: 'var(--navy)' }">
          <AppIcon :name="card.icon" :size="22" />
        </span>
        <h3>{{ card.title }}</h3>
        <p class="mb-0">{{ card.text }}</p>
        <ul class="sc-list">
          <li v-for="(item, i) in card.items" :key="i">{{ item }}</li>
        </ul>
        <span class="cat-cta" style="color: var(--gold); margin-top: auto">{{ card.cta }} →</span>
      </NuxtLink>
    </div>

    <!-- Premios más recientes -->
    <div class="section-title">
      <div>
        <p class="eyebrow">Actualidad</p>
        <h2>Últimos galardonados</h2>
      </div>
      <NuxtLink to="/laureates" class="btn btn-ghost btn-sm">Ver todos</NuxtLink>
    </div>

    <div class="card-grid">
      <LaureateCard v-for="r in latest" :key="r.id" :record="r" />
    </div>
  </div>
</template>
