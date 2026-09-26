<script setup>
// Iconos SVG en línea (sin librerías externas ni emojis).
// Usa currentColor: el color del icono se hereda del contenedor.
const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 24 },
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Medalla / premio -->
    <g v-if="name === 'medal'">
      <circle cx="12" cy="9.5" r="5.2" />
      <path d="M12 12.4v2.1" />
      <path d="M8.9 13.9 7.7 21 12 18.5 16.3 21l-1.2-7.1" />
    </g>

    <!-- Calendario -->
    <g v-else-if="name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </g>

    <!-- Lupa / buscar -->
    <g v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.3-4.3" />
    </g>

    <!-- Átomo -->
    <g v-else-if="name === 'atom'">
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </g>

    <!-- Matraz -->
    <g v-else-if="name === 'flask'">
      <path d="M14 2v6a2 2 0 0 0 .24.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.75-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
      <path d="M6.5 15h11" />
      <path d="M8.5 2h7" />
    </g>

    <!-- Corazón -->
    <g v-else-if="name === 'heart'">
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      />
    </g>

    <!-- Libro abierto -->
    <g v-else-if="name === 'book'">
      <path d="M12 7v14" />
      <path
        d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z"
      />
    </g>

    <!-- Paz: paloma / rama de olivo -->
    <g v-else-if="name === 'dove'">
      <path d="M3.5 15.5c3 .6 5.6-.2 7.6-2.4" />
      <path d="M13.5 10.2 18.5 3l-1 6.4c1.7-.4 3.4-.3 4.5.5-2 .8-4.4.6-6.2-.3" />
      <path d="M12.4 13.6 9 17l1.6-.3c.3 1 .9 1.9 1.8 2.6l.6-2.2" />
      <path d="M6.8 14.4 4.5 17" />
    </g>

    <!-- Balanza / ciencias económicas -->
    <g v-else-if="name === 'scale'">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </g>

    <!-- Pluma -->
    <g v-else-if="name === 'quill'">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5Z" />
      <path d="m16 8-13 14" />
      <path d="M17.5 15H9" />
    </g>

    <!-- Globo terráqueo -->
    <g v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="8.5" />
      <ellipse cx="12" cy="12" rx="3.4" ry="8.5" />
      <path d="M3.5 12h17" />
    </g>

    <!-- Genérico -->
    <g v-else>
      <circle cx="12" cy="12" r="5.5" />
    </g>
  </svg>
</template>
