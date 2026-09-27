<script setup>
// Las categorías del pie también provienen de Comet CMS.
const { data: cats } = await useCometList('categories')
const categories = computed(() =>
  [...(cats.value || [])].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)),
)
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>Premios Nobel</h4>
          <p class="mb-0" style="max-width: 42ch">
            Sitio académico de Arquitectura de Información para explorar más de
            mil premios Nobel concedidos entre 1901 y 2025: por categoría, por
            año o mediante búsqueda.
          </p>
        </div>
        <div>
          <h4>Explorar</h4>
          <ul>
            <li><NuxtLink to="/">Inicio</NuxtLink></li>
            <li><NuxtLink to="/categories">Por categoría</NuxtLink></li>
            <li><NuxtLink to="/years">Por año</NuxtLink></li>
            <li><NuxtLink to="/laureates">Todos los galardonados</NuxtLink></li>
          </ul>
        </div>
        <div>
          <h4>Categorías</h4>
          <ul>
            <li v-for="c in categories" :key="c.slug">
              <NuxtLink :to="`/categories/${c.slug}`">{{ c.name }}</NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-note">
        <span>
          Datos: Nobel Prize Outreach AB · © The Nobel Foundation. Contenido
          bajo licencia
          <a
            href="https://www.nobelprize.org/about/terms-of-use-for-api-nobelprize-org-and-data-nobelprize-org/"
            target="_blank"
            rel="noopener noreferrer"
            >CC BY 4.0</a
          >.
        </span>
        <span>Tarea 3 · Kristel Duarte Pérez · Arquitectura de Información · © {{ year }}</span>
      </div>
    </div>
  </footer>
</template>
