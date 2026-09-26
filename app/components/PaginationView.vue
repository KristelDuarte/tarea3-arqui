<script setup>
const props = defineProps({
  total: { type: Number, required: true },
  perPage: { type: Number, default: 24 },
  modelValue: { type: Number, default: 1 },
})

const emit = defineEmits(['update:modelValue'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const page = computed({
  get: () => Math.min(Math.max(1, props.modelValue), totalPages.value),
  set: (v) => emit('update:modelValue', v),
})

const items = computed(() => {
  const total = totalPages.value
  const current = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const set = new Set([1, total, current - 1, current, current + 1])
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out = []
  let prev = 0
  for (const n of nums) {
    if (n - prev > 1) out.push('…')
    out.push(n)
    prev = n
  }
  return out
})

function go(n) {
  if (n >= 1 && n <= totalPages.value && n !== page.value) {
    page.value = n
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="Paginación">
    <button type="button" :disabled="page === 1" aria-label="Página anterior" @click="go(page - 1)">
      ←
    </button>

    <template v-for="(it, i) in items" :key="i">
      <button v-if="it === '…'" type="button" class="dots" disabled>…</button>
      <button
        v-else
        type="button"
        :class="{ current: it === page }"
        :aria-current="it === page ? 'page' : undefined"
        @click="go(it)"
      >
        {{ it }}
      </button>
    </template>

    <button type="button" :disabled="page === totalPages" aria-label="Página siguiente" @click="go(page + 1)">
      →
    </button>
  </nav>
</template>
