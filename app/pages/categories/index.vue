<script setup>
useHead({ title: 'Categorías · Premios Nobel' })

const { data: catRows } = await useCometList('categories')
const { data: laureates } = await useCometList('laureates', { include: 'category' })

// El conteo por categoría se calcula a partir de los galardonados enlazados.
const cats = computed(() => {
  const counts = new Map()
  for (const l of laureates.value || []) {
    const slug = l.category?.slug
    if (slug) counts.set(slug, (counts.get(slug) || 0) + 1)
  }
  return [...(catRows.value || [])]
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .map((c) => ({ ...c, count: counts.get(c.slug) || 0 }))
})

const total = computed(() => (laureates.value || []).length)
</script>

<template>
  <div>
    <div class="section-title">
      <div>
        <p class="eyebrow">Esquema temático</p>
        <h2>Explorar por categoría</h2>
        <p class="lead mb-0">
          Las seis disciplinas distinguidas con un Premio Nobel, con un total de
          {{ total.toLocaleString('es') }} premios entre 1901 y 2025.
        </p>
      </div>
    </div>

    <div v-if="cats?.length" class="cat-grid">
      <NuxtLink
        v-for="c in cats"
        :key="c.slug"
        :to="`/categories/${c.slug}`"
        class="cat-card"
        :style="{ '--cat': c.color }"
      >
        <span class="sc-icon" :style="{ background: `${c.color}22`, color: c.color }">
          <AppIcon :name="c.icon || 'atom'" :size="22" />
        </span>
        <h3>{{ c.name }}</h3>
        <p class="cat-count">
          {{ c.count.toLocaleString('es') }} premios · desde {{ c.ordinal === 6 ? 1969 : 1901 }}
        </p>
        <p class="cat-desc">{{ c.description }}</p>
        <span class="cat-cta" :style="{ color: c.color }">Ver galardonados →</span>
      </NuxtLink>
    </div>

    <div v-else class="empty">
      <h3>Sin datos</h3>
      <p>No se encontraron categorías en el dataset.</p>
    </div>
  </div>
</template>
