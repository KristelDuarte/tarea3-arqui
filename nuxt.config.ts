/**
 * nuxt.config.ts
 * --------------
 * El contenido de este proyecto ya NO vive dentro de Nuxt (no se usa
 * @nuxt/content): se administra en Comet CMS (headless) y se consume mediante
 * su API REST a través del proxy de servidor `server/api/comet/[...path].ts`.
 *
 * El token de la API vive únicamente en el servidor: se declara aquí como
 * runtimeConfig privado (no está bajo `public`, así que Nuxt nunca lo envía
 * al navegador) y se sobrescribe con variables de entorno `NUXT_COMET_*`.
 */

import { cometReadAll } from './server/utils/comet'

async function collectCometRoutes(): Promise<string[]> {
  const baseUrl = String(process.env.NUXT_COMET_URL || 'https://cms-una.gt.tc').replace(/\/+$/, '')
  const workspace = String(process.env.NUXT_COMET_WORKSPACE || 'premios-nobel')
  const token = String(process.env.NUXT_COMET_API_TOKEN || '')

  const routes: string[] = []
  try {
    const [categories, laureates] = await Promise.all([
      cometReadAll(baseUrl, workspace, 'categories', token),
      cometReadAll(baseUrl, workspace, 'laureates', token),
    ])

    for (const category of categories) {
      if (category?.slug) routes.push(`/categories/${category.slug}`)
    }

    const years = new Set<number>()
    for (const laureate of laureates) {
      if (laureate?.slug) routes.push(`/laureates/${laureate.slug}`)
      const year = Number(laureate?.data?.year)
      if (Number.isFinite(year) && year > 0) years.add(year)
    }
    for (const year of years) routes.push(`/years/${year}`)

    console.log(`[comet] ${routes.length} rutas dinámicas añadidas al prerender.`)
  } catch (error: any) {
    console.warn('[comet] No se pudieron enumerar las rutas dinámicas:', error?.message || error)
  }

  return routes
}

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',

  // Ya no hay módulo de contenido local: todo viene de Comet CMS.
  modules: [],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    cometApiToken: '',
    cometUrl: 'https://cms-una.gt.tc',
    cometWorkspace: 'premios-nobel',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      title: 'Premios Nobel — Catálogo de galardonados',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Explora más de mil Premios Nobel otorgados entre 1901 y 2025: navega por categoría, por año o mediante búsqueda.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
    },
  },

  hooks: {
    // Con `nuxt generate` las rutas dinámicas se deben conocer en el build.
    async 'prerender:routes'(ctx: { routes: Set<string> }) {
      const routes = await collectCometRoutes()
      for (const route of routes) ctx.routes.add(route)
    },
  },
})
