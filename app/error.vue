<script setup>
// Página de error (404 y errores generales).
const props = defineProps({ error: Object })

useHead({ title: props.error?.statusCode === 404 ? 'Página no encontrada' : 'Error' })

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="center" style="padding: 70px 0">
    <p class="eyebrow" style="justify-content: center">Premios Nobel</p>
    <h1 style="font-size: 3.2rem">{{ error?.statusCode || 'Error' }}</h1>
    <p class="lead" style="max-width: 46ch; margin: 0 auto 22px">
      {{ error?.statusMessage || error?.message || 'Algo salió mal al mostrar esta página.' }}
    </p>
    <button type="button" class="btn" @click="goHome">Volver al inicio</button>
  </div>
</template>
