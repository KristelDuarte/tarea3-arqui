<script setup>
const props = defineProps({
  record: { type: Object, required: true },
})

// La relación `category` llega ya expandida y normalizada desde Comet.
const category = computed(() =>
  props.record.category && typeof props.record.category === 'object'
    ? props.record.category
    : null,
)
const catColor = computed(() => category.value?.color || '#13315c')
const catName = computed(() => category.value?.name || '—')

const initials = computed(() => {
  const n = props.record.laureate || props.record.title || ''
  const parts = n.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
})

const genderLabel = computed(() => {
  const g = props.record.gender
  if (g === 'female') return 'Mujer'
  if (g === 'org') return 'Organización'
  return 'Hombre'
})
</script>

<template>
  <article class="laureate-card">
    <div class="lc-head">
      <span class="lc-medal" :style="{ background: catColor }" aria-hidden="true">
        {{ initials }}
      </span>
      <div class="lc-badges">
        <span class="chip chip-cat" :style="{ background: catColor }">{{ catName }}</span>
        <span v-if="record.birth_country" class="chip">{{ record.birth_country }}</span>
      </div>
    </div>

    <h3 class="lc-name">{{ record.laureate || record.title }}</h3>
    <p class="lc-motivation">
      {{ record.motivation || 'Concedido por sus contribuciones destacadas en esta disciplina.' }}
    </p>

    <div class="lc-foot">
      <span class="lc-year">{{ record.year }}</span>
      <span class="chip">{{ genderLabel }}</span>
      <NuxtLink class="lc-link" :to="`/laureates/${record.slug}`">
        Ver ficha <span aria-hidden="true">→</span>
      </NuxtLink>
    </div>
  </article>
</template>
