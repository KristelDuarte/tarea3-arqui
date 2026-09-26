<script setup>
const route = useRoute()
const year = Number(route.params.year)

if (!Number.isInteger(year)) {
  throw createError({ statusCode: 404, statusMessage: 'Año no válido', fatal: true })
}

// Se traen todos los galardonados (con su categoría) y se agrupan por año.
const { data: rows } = await useCometList('laureates', { include: 'category' })

const records = computed(() =>
  (rows.value || [])
    .filter((r) => Number(r.year) === year)
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug))),
)

const yearsWithAwards = computed(() =>
  [...new Set((rows.value || []).map((r) => Number(r.year)).filter(Boolean))].sort(
    (a, b) => a - b,
  ),
)

const prevYear = computed(() => {
  const arr = yearsWithAwards.value
  const i = arr.indexOf(year)
  return i > 0 ? arr[i - 1] : null
})

const nextYear = computed(() => {
  const arr = yearsWithAwards.value
  const i = arr.indexOf(year)
  return i >= 0 && i < arr.length - 1 ? arr[i + 1] : null
})

const emptyYear = computed(() => records.value.length === 0)

useHead({ title: `Premios Nobel de ${year}` })
</script>

<template>
  <div>
    <nav class="breadcrumb" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink>
      <span class="sep">/</span>
      <NuxtLink to="/years">Por año</NuxtLink>
      <span class="sep">/</span>
      <span>{{ year }}</span>
    </nav>

    <div v-if="!emptyYear">
      <section class="detail-hero">
        <p class="eyebrow">Premios Nobel de</p>
        <h1 class="detail-name">{{ year }}</h1>
        <p class="detail-sub mb-0">
          {{ records.length.toLocaleString('es') }}
          {{ records.length === 1 ? 'premio concedido' : 'premios concedidos' }} en la ceremonia de
          este año.
        </p>
      </section>

      <div class="section-title">
        <div>
          <p class="eyebrow">Galardonados</p>
          <h2>Premiados en {{ year }}</h2>
        </div>
      </div>

      <div class="card-grid">
        <LaureateCard v-for="r in records" :key="r.id" :record="r" />
      </div>
    </div>

    <div v-else class="empty" style="margin-top: 22px">
      <h3>Sin ceremonia en {{ year }}</h3>
      <p>No se concedieron Premios Nobel en {{ year }}. Vuelve al índice de años.</p>
      <NuxtLink to="/years" class="btn btn-sm mt-2">Ver todos los años</NuxtLink>
    </div>

    <nav v-if="!emptyYear" class="pagination" aria-label="Navegar entre años">
      <NuxtLink
        v-if="prevYear"
        :to="`/years/${prevYear}`"
        class="btn btn-ghost btn-sm"
        style="text-decoration: none"
      >
        ← {{ prevYear }}
      </NuxtLink>
      <NuxtLink to="/years" class="btn btn-navy btn-sm" style="text-decoration: none">Índice de años</NuxtLink>
      <NuxtLink v-if="nextYear" :to="`/years/${nextYear}`" class="btn btn-ghost btn-sm" style="text-decoration: none">
        {{ nextYear }} →
      </NuxtLink>
    </nav>
  </div>
</template>
