<script setup>
useHead({ title: 'Por año · Premios Nobel' })

const { data: rows } = await useCometList('laureates')

const totals = computed(() => {
  const arr = (rows.value || []).map((r) => Number(r.year)).filter(Boolean)
  return {
    years: new Set(arr).size,
    records: arr.length,
  }
})

const decades = computed(() => {
  const map = new Map()
  for (const r of rows.value || []) {
    const year = Number(r.year)
    if (!year) continue
    const bucket = Math.floor(year / 10) * 10
    if (!map.has(bucket)) map.set(bucket, new Map())
    const counts = map.get(bucket)
    counts.set(year, (counts.get(year) || 0) + 1)
  }

  const buckets = [...map.keys()].sort((a, b) => a - b)
  const maxYear = buckets.length ? Math.max(...buckets) + 9 : 0

  return buckets.map((bucket) => {
    const years = [...map.get(bucket).keys()].sort((a, b) => a - b)
    let start = bucket
    const end = Math.min(bucket + 9, maxYear)
    if (bucket === 1900) start = 1901
    return {
      label: `${start} – ${end}`,
      years: years.map((year) => ({ year, count: map.get(bucket).get(year) })),
    }
  })
})
</script>

<template>
  <div>
    <div class="section-title">
      <div>
        <p class="eyebrow">Esquema cronológico</p>
        <h2>Explorar por año</h2>
        <p class="lead mb-0">
          {{ totals.years }} años con ceremonia ({{ totals.records.toLocaleString('es') }} premios en
          total), agrupados por década. Los años sin ceremonia —1940, 1941 y 1942— no aparecen.
        </p>
      </div>
    </div>

    <div v-if="decades.length">
      <section v-for="d in decades" :key="d.label" class="decade-block">
        <h3>{{ d.label }}</h3>
        <div class="year-chips">
          <NuxtLink v-for="y in d.years" :key="y.year" :to="`/years/${y.year}`" class="year-chip">
            {{ y.year }}
            <small>{{ y.count }} {{ y.count === 1 ? 'premio' : 'premios' }}</small>
          </NuxtLink>
        </div>
      </section>
    </div>

    <div v-else class="empty">
      <h3>Sin datos</h3>
      <p>No hay años registrados en el dataset.</p>
    </div>
  </div>
</template>
