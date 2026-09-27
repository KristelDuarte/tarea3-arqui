# Proyecto — Arquitectura de Información

**Tema:** Premios Nobel — catálogo de galardonados (1901–2025)

**Estudiante:** Kristel Duare Perez

**Cédula:** 119010766

**URL del proyecto (Netlify):** https://tarea-3-arqui.netlify.app/

**Repositorio:** https://github.com/KristelDuarte/tarea3-arqui

---

## Descripción

Sitio en **Nuxt 4** que explora el dataset de los Premios Nobel por categoría,
por año y mediante búsqueda/paginación. A partir de la Tarea 3, el contenido se
administra en **Comet CMS** (CMS headless) y se consume por su API REST: el
proyecto ya no usa `@nuxt/content`.

- **CMS:** https://cms-una.gt.tc — workspace `Premios Nobel` (`premios-nobel`)
- **Guía de configuración y uso del CMS:** [`docs/comet-cms.md`](docs/comet-cms.md)

## Puesta en marcha

```bash
npm install
cp .env.example .env      # completa NUXT_COMET_URL, NUXT_COMET_WORKSPACE y los tokens
npm run cms:import        # carga el dataset en Comet CMS (una sola vez)
npm run dev               # http://localhost:3000
```

| Script              | Descripción                                              |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                                   |
| `npm run generate`  | Genera el sitio estático (lo que despliega Netlify)      |
| `npm run build`     | Build de Nuxt + prerender del sitio                      |
| `npm run cms:import`| Importa `content/nobel.csv` a Comet CMS                  |
| `npm run data`      | Regenera el CSV y las categorías desde la API del Nobel  |

## Estructura

```
app/
  components/     HeaderView, FooterView, LaureateCard, PaginationView, AppIcon
  pages/          index, categories/, laureates/, years/
  utils/comet.ts  normalización de entradas + useCometList/useCometEntry
server/
  api/comet/[...path].ts   proxy hacia Comet CMS (oculta el token)
scripts/
  build-dataset.mjs        descarga el dataset del Nobel (entrada)
  import-to-comet.mjs      sube el dataset a Comet CMS
content/                   datos de origen (CSV + JSON) para la importación
docs/comet-cms.md          guía de Comet CMS
```

## Seguridad

El token de la API vive **solo en el servidor** (`runtimeConfig` privado y
variables de entorno `NUXT_COMET_*`). El navegador llama únicamente a
`/api/comet/...`; el encabezado `Authorization` se agrega en Nitro y nunca se
expone al cliente.

## Decisiones y limitaciones

Notas técnicas del uso de Comet CMS **v1.0.1**, útiles para reproducir el proyecto:

- **El contenido no vive en el repositorio.** Se administra en Comet CMS y se
  consulta por su API REST a través del proxy `server/api/comet/[...path].ts`, que
  agrega el encabezado `Authorization` en el servidor: el token **nunca** llega al
  navegador.
- **v1.0.1 no permite marcar los content types como *Private*** (esa opción llega
  en v1.0.2), así que **la lectura es pública y no necesita token**. El código ya
  soporta el caso *Private*: basta definir `NUXT_COMET_API_TOKEN` y marcar los
  tipos como privados.
- **Los filtros sobre relaciones usan el `slug`**, no el `id`
  (`filter[category]=economic`), aunque la relación almacene el id internamente.
- **El hosting del CMS responde `508` cuando se satura** y protege las peticiones
  con un *challenge* de cookie (`aes.js`). El proxy resuelve el challenge, cachea
  las respuestas en memoria y reintenta con espera, para que `nuxt generate`
  complete el prerender sin agotar el límite del hosting.
- **Local vs Netlify:** `npm run generate` local escribe en `.output/public/`, pero
  dentro de Netlify Nuxt usa el preset `netlify-static` y escribe en `dist/` (por
  eso `netlify.toml` publica `dist`).
- **Sitio estático:** el contenido se lee al construir. Para reflejar cambios del
  CMS hay que reconstruir (Build hook de Netlify + Webhook de Comet).

## Datos y atribución

Los datos se obtienen de la [API de los Premios Nobel](https://www.nobelprize.org/)
(Nobel Prize Outreach AB). Contenido de la Fundación Nobel distribuido bajo licencia
[CC BY 4.0](https://www.nobelprize.org/about/terms-of-use-for-api-nobelprize-org-and-data-nobelprize-org/).

Trabajo académico · Arquitectura de Información.
