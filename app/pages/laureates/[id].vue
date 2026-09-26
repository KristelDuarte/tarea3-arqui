<script setup>
const route = useRoute()
const slug = String(route.params.id)

// Detalle con la categoría relacionada expandida: Comet reemplaza el id de la
// relación por la entrada completa, así que no hacen falta peticiones extra.
const { data: rec } = await useCometEntry('laureates', slug, { include: 'category' })

if (!rec.value) {
  throw createError({ statusCode: 404, statusMessage: 'Registro no encontrado', fatal: true })
}

const cat = computed(() =>
  rec.value?.category && typeof rec.value.category === 'object' ? rec.value.category : null,
)

// Otros premiados del mismo año, usando el filtro de Comet sobre el campo `year`.
const year = computed(() => rec.value?.year)
const { data: sameYear } = await useCometList('laureates', {
  'filter[year]': year.value,
  include: 'category',
})

const others = computed(() =>
  (sameYear.value || []).filter((r) => r.slug !== slug).slice(0, 6),
)

useHead({ title: `${rec.value.laureate || rec.value.title} · Premios Nobel` })

const genderLabel = computed(() => {
  const g = rec.value.gender
  if (g === 'female') return 'Mujer'
  if (g === 'org') return 'Organización'
  return 'Hombre'
})

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y) return ''
  if (!d || !m) return String(y)
  return `${d} de ${MONTHS[m - 1]} de ${y}`
}

const birthText = computed(() => {
  const parts = []
  if (rec.value.birth_date) parts.push(fmtDate(rec.value.birth_date))
  if (rec.value.birth_place) parts.push(rec.value.birth_place)
  return parts.join(' · ')
})

const lifeSpan = computed(() => {
  const by = rec.value.birth_date ? String(rec.value.birth_date).slice(0, 4) : ''
  const dy = rec.value.death_date ? String(rec.value.death_date).slice(0, 4) : ''
  if (by && dy) return `${by} – ${dy}`
  return by ? `Nacido en ${by}` : ''
})
</script>

<template>
  <div v-if="rec">
    <nav class="breadcrumb" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink>
      <span class="sep">/</span>
      <NuxtLink to="/laureates">Galardonados</NuxtLink>
      <span class="sep">/</span>
      <span>{{ rec.laureate }}</span>
    </nav>

    <section class="detail-hero" :style="{ '--catcolor': cat?.color || 'var(--gold)' }">
      <img
        v-if="rec.photo && rec.photo.length"
        :src="rec.photo[0]"
        :alt="rec.laureate || rec.title"
        style="width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; box-shadow: 0 6px 18px rgba(19, 49, 92, 0.18); margin-bottom: 14px"
      />
      <p class="eyebrow">{{ cat?.fullname || 'Premio Nobel' }}</p>
      <h1 class="detail-name">{{ rec.laureate || rec.title }}</h1>

      <div class="dh-eyebrow">
        <span class="chip chip-cat" :style="{ background: cat?.color || '#13315c' }">
          {{ cat?.name || '—' }}
        </span>
        <NuxtLink class="chip" :to="`/years/${rec.year}`">Premio de {{ rec.year }}</NuxtLink>
        <span class="chip">{{ genderLabel }}</span>
        <span v-if="lifeSpan" class="chip">{{ lifeSpan }}</span>
      </div>

      <div v-if="rec.motivation" class="quote">
        <p>{{ rec.motivation }}</p>
      </div>

      <div class="detail-meta">
        <div v-if="cat" class="meta-item">
          <span class="mi-label">Categoría</span>
          <span class="mi-value">
            <NuxtLink :to="`/categories/${cat.slug}`" style="color: inherit">{{ cat.name }}</NuxtLink>
          </span>
        </div>
        <div v-if="rec.affiliation" class="meta-item">
          <span class="mi-label">Institución</span>
          <span class="mi-value">{{ rec.affiliation }}</span>
        </div>
        <div v-if="rec.birth_country" class="meta-item">
          <span class="mi-label">País de nacimiento</span>
          <span class="mi-value">{{ rec.birth_country }}</span>
        </div>
        <div v-if="birthText" class="meta-item">
          <span class="mi-label">Nacimiento</span>
          <span class="mi-value">{{ birthText }}</span>
        </div>
        <div v-if="rec.death_date" class="meta-item">
          <span class="mi-label">Fallecimiento</span>
          <span class="mi-value">{{ fmtDate(rec.death_date) }}</span>
        </div>
      </div>
    </section>

    <div class="detail-lower">
      <section class="related-box">
        <p class="mini-heading">En esta categoría</p>
        <p class="mb-0">
          {{ cat?.description }}
        </p>
        <NuxtLink
          v-if="cat"
          :to="`/categories/${cat.slug}`"
          class="btn btn-ghost btn-sm mt-2"
          style="text-decoration: none"
        >
          Ver todos los premios de {{ cat.name }} →
        </NuxtLink>
      </section>

      <section class="related-box">
        <p class="mini-heading">Otros premiados en {{ rec.year }}</p>
        <ul v-if="others.length" class="related-list">
          <li v-for="o in others" :key="o.id">
            <NuxtLink :to="`/laureates/${o.slug}`">
              <span class="rl-name">{{ o.laureate || o.title }}</span>
              <span class="rl-year">{{ o.year }}</span>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="muted mb-0">No hay otros registros compartidos este año en el dataset.</p>
        <NuxtLink :to="`/years/${rec.year}`" class="btn btn-ghost btn-sm mt-2" style="text-decoration: none">
          Ver ceremonia de {{ rec.year }}
        </NuxtLink>
      </section>
    </div>
  </div>
</template>
