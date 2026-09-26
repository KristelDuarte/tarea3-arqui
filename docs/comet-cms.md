# Uso de Comet CMS (Tarea 3)

Guía para administrar el contenido del sitio **Premios Nobel** desde
[Comet CMS](https://getcometcms.github.io/CometCMS/) (CMS headless) y consumirlo
desde Nuxt.

- **Sitio publicado (Netlify):** https://proyecto1-arqui.netlify.app/
- **CMS:** https://cms-una.gt.tc · **Workspace:** `Premios Nobel` (`premios-nobel`)
- **Estudiante:** Kristel Duare Perez · **Cédula:** 119010766

---

## Índice

1. [Arquitectura](#1-arquitectura)
2. [Crear los content types en el panel](#2-crear-los-content-types-en-el-panel)
3. [Generar los API tokens](#3-generar-los-api-tokens)
4. [Configurar el proyecto Nuxt](#4-configurar-el-proyecto-nuxt)
5. [Importar los datos del Proyecto 1](#5-importar-los-datos-del-proyecto-1)
6. [Ejecutar y publicar](#6-ejecutar-y-publicar)
7. [Cómo se consume el contenido](#7-cómo-se-consume-el-contenido)

---

## 1. Arquitectura

```
Navegador ──► Nuxt (Nitro)  ──►  Comet CMS
              /api/comet/...        /api/v1/workspaces/{ws}/content/{colección}
              (+ Authorization)
```

- El contenido **ya no vive dentro del proyecto** (no se usa `@nuxt/content`):
  reside en Comet CMS y se consulta por HTTP.
- El **token nunca llega al navegador**: el navegador llama a la ruta de servidor
  `server/api/comet/[...path].ts`, que reenvía la petición a Comet CMS agregando
  el encabezado `Authorization: Bearer ctcms_...`.
- Comet responde con el sobre `{ data, meta }`; los campos propios de cada
  entrada vienen dentro de `data` (ver [§7](#7-cómo-se-consume-el-contenido)).

> **Nota sobre el hosting.** `cms-una.gt.tc` protege las peticiones con un
> _challenge_ de cookie (`aes.js` / `__test`): sin esa cookie el servidor
> responde una página HTML en lugar de JSON. Por eso `server/utils/comet.ts`
> resuelve el challenge (descifra la cookie con AES-128-CBC) y la reutiliza en
> caché; tanto el proxy de Nuxt como `scripts/import-to-comet.mjs` la usan. Si el
> hosting dejara de aplicar el challenge, el código sigue funcionando igual:
> cuando la respuesta ya es JSON no hace nada especial.

---

## 2. Crear los content types en el panel

En el panel del CMS: **Content types → New content type**. Se crean dos
colecciones (*Collection*, no *Single page*).

> **Ajuste `API access` (Private/Public).** Esta opción **no existe en CometCMS
> v1.0.1** (la versión desplegada en el curso), donde los content types son
> siempre públicos y la lectura **no requiere token**. Está disponible desde
> **v1.0.2** (Ajustes → *API access: Private*). Si el CMS se actualiza, marca
> `categories` y `laureates` como **Private** y define el token de lectura; el
> código soporta ambos casos sin cambios.

> **`title` y `slug` ya vienen incluidos** en todos los content types (el propio
> panel lo indica: *“Fields (title and slug are always included)”*). **No hay que
> crearlos**: sólo se agregan los campos propios de cada colección. Deja el
> `slug` **sin `source`**; el script de importación escribe su valor
> (`physics`, `chemistry`, …).

### 2.1 `categories`

| Campo         | Tipo       | Opciones                            |
| ------------- | ---------- | ----------------------------------- |
| `name`        | `text`     | requerido                           |
| `fullname`    | `text`     |                                     |
| `ordinal`     | `number`   | orden de la categoría (1–6)         |
| `color`       | `color`    | color de acento                     |
| `icon`        | `text`     | `atom`, `flask`, `heart`…           |
| `description` | `textarea` | descripción larga                   |

> El `slug` de cada categoría se fija manualmente a `physics`, `chemistry`,
> `medicine`, `literature`, `peace`, `economic` (lo hace el script de importación).

### 2.2 `laureates`

| Campo         | Tipo       | Opciones                                        |
| ------------- | ---------- | ----------------------------------------------- |
| `laureate`    | `text`     | requerido                                       |
| `gender`      | `select`   | `male`, `female`, `org`                         |
| `year`        | `number`   | requerido                                       |
| `category`    | `relation` | **target: `categories`** (selección simple) ⬅ **llave foránea** |
| `motivation`  | `textarea` | motivación del premio                           |
| `affiliation` | `text`     | institución                                     |
| `birth_date`  | `date`     |                                                 |
| `birth_place` | `text`     |                                                 |
| `birth_country` | `text`   |                                                 |
| `death_date`  | `date`     |                                                 |
| `photo`       | `media`    | *(opcional)* retrato del galardonado            |

La relación `laureates.category → categories` es la **llave foránea**: Comet
guarda el `id` de la categoría y la puede expandir con `?include=category`.

---

## 3. Generar los API tokens

> **Nota de versión.** En **v1.0.1** la lectura pública no requiere token (los
> content types no se pueden marcar como privados), así que el *token de
> lectura* sólo es imprescindible en **v1.0.2+**. El *token de importación* sí
> hace falta siempre que quieras cargar el CSV en bloque
> (`content.create/update/publish`). También puedes dar de alta registros a
> mano desde el panel, sin ningún token.

**Dónde está la pantalla** (según la versión del CMS):

| Versión | Menú | URL |
| ------- | ---- | --- |
| v1.0.1 | Developer → **API-Tokens** | `https://cms-una.gt.tc/admin/api-tokens` |
| v1.0.2+ | Connect → **Access tokens** | `https://cms-una.gt.tc/admin/connect/access-tokens` |

> Si el ítem no aparece en el menú lateral, tu rol no incluye `tokens.read`
> (pasa con roles restringidos). La vista se puede abrir igual entrando por la
> URL directa.

Se recomienda **dos** tokens para respetar el principio de menor privilegio.
Para crear cada uno: **New token** → *Token name* y *Description* → en
**Permission grants** elige la pestaña **Content** → *Content type*:
**All types** → marca **sólo** las acciones necesarias (abajo del editor se
muestra el resumen del permiso) → **Create**.

> El valor `ctcms_...` **sólo se muestra una vez**. Cópialo de inmediato.

### Token de lectura (lo usa el sitio desplegado)

Acciones marcadas: **Read** únicamente. El resumen debe decir
`Allow content.read on content:*:*`.

| Acción         | Recursos                                          |
| -------------- | ------------------------------------------------- |
| `content.read` | `content:categories:*`, `content:laureates:*`     |

```json
[
  {
    "effect": "allow",
    "actions": ["content.read"],
    "resources": ["content:categories:*", "content:laureates:*"]
  }
]
```

### Token de importación (sólo se usa en local, nunca en Netlify)

Acciones marcadas: **Read + Create + Edit + Publish**. El resumen debe decir
`Allow content.read, content.create, content.update, content.publish on content:*:*`.

| Acciones                                                     | Recursos                                      |
| ------------------------------------------------------------ | --------------------------------------------- |
| `content.read`, `content.create`, `content.update`, `content.publish` | `content:categories:*`, `content:laureates:*` |

```json
[
  {
    "effect": "allow",
    "actions": ["content.read", "content.create", "content.update", "content.publish"],
    "resources": ["content:categories:*", "content:laureates:*"]
  }
]
```

> El token sólo se muestra **una vez** al crearlo. Cópialo de inmediato.

---

## 4. Configurar el proyecto Nuxt

`runtimeConfig` ya está declarado en `nuxt.config.ts`:

```ts
runtimeConfig: {
  cometApiToken: '',
  cometUrl: 'https://cms-una.gt.tc',
  cometWorkspace: 'premios-nobel',
}
```

Copia `.env.example` a `.env` (el `.env` está en `.gitignore` y **no** se sube al
repositorio) y completa los valores:

```bash
NUXT_COMET_URL=https://cms-una.gt.tc
NUXT_COMET_WORKSPACE=premios-nobel
NUXT_COMET_API_TOKEN=ctcms_...   # token de lectura
COMET_IMPORT_TOKEN=ctcms_...     # token de importación (sólo local)
```

Nuxt convierte automáticamente `NUXT_COMET_API_TOKEN` en `cometApiToken`, etc.
Al no estar bajo `public`, el token **nunca** se incluye en el bundle del cliente.

---

## 5. Cargar el contenido

### Opción A — Alta manual desde el panel (no requiere token)

En **Content → Categorías** crea las 6 categorías escribiendo el `slug` a mano
(`physics`, `chemistry`, `medicine`, `literature`, `peace`, `economic`) y, luego,
en **Laureado** agrega algunos galardonados enlazando su categoría con el
selector del campo `category`. Deja cada entrada en estado **Published** (las
lecturas públicas solo devuelven entradas publicadas).

### Opción B — Importación masiva del CSV (requiere token de escritura)

El script `scripts/import-to-comet.mjs` lee `content/categories/*.json` y
`content/nobel.csv`, crea primero las categorías y luego enlaza cada galardonado
con su categoría (campo `category`). Usa `COMET_IMPORT_TOKEN`.

```bash
npm run cms:import                 # importa todo
npm run cms:import -- --limit=40   # sólo 40 galardonados
npm run cms:import -- --update     # actualiza los que ya existen
npm run cms:import -- --dry-run    # muestra lo que haría, sin escribir
```

### Verificar la configuración

```bash
npm run cms:check   # conexión, content types, campos, relación y conteos
```

Notas:

- Por defecto **omite** las entradas cuyo `slug` ya existe; con `--update` las
  actualiza (`PUT`).
- Cada galardonado recibe un `slug` único (`marie-curie-1911`), que es el que se
  usa en las URLs del sitio.
- `status: published` es obligatorio para que la API pública devuelva la entrada.

---

## 6. Ejecutar y publicar

```bash
npm install
npm run dev        # desarrollo local
npm run generate   # sitio estático (lo que usa Netlify)
```

### Netlify

1. **Site settings → Environment variables**: define
   `NUXT_COMET_URL`, `NUXT_COMET_WORKSPACE` y `NUXT_COMET_API_TOKEN`
   (el token de **lectura**). El `.env` local no se sube al repositorio.
2. **Build**: `npm run generate` · **Publish directory**: `.output/public`
   (ya configurado en `netlify.toml`).
3. **Refresco automático**: como `generate` pre-renderiza el sitio, para que los
   cambios del CMS se reflejen hay que reconstruir. En Netlify crea un
   **Build hook** (Site settings → Build hooks) y en Comet CMS agrega un
   **Webhook** (System → Webhooks) apuntando a esa URL, disparado por
   `content.published` y `content.unpublished`.

> Alternativa (SSR): pon `nitro.prerender.crawlLinks = false` en
> `nuxt.config.ts` y despliega con `npm run build` usando el preset de servidor
> de Netlify. Así cada visita consulta el CMS y refleja los cambios al instante,
> a costa de una respuesta algo más lenta.

---

## 7. Cómo se consume el contenido

La API pública de Comet devuelve cada entrada con los campos anidados en `data`:

```json
{
  "id": "7K4p9xQ2mR",
  "slug": "marie-curie-1911",
  "type": "laureates",
  "status": "published",
  "title": "Marie Curie",
  "data": {
    "laureate": "Marie Curie",
    "year": 1911,
    "category": { "id": "a1b2c3", "slug": "chemistry", "data": { "name": "Química" } }
  }
}
```

`app/utils/comet.ts` expone `useCometList()` / `useCometEntry()`, que consultan el
proxy y **aplanan** esa estructura con `normalizeCometEntry()`, de modo que las
plantillas escriben `r.category.slug` en lugar de `r.data.category.data.slug`.

> **Ojo con los filtros sobre relaciones.** Aunque la relación almacena el `id`
> de la entrada relacionada, `filter[campo]` en Comet compara contra el **`slug`**
> de esa entrada (`filter[category]=economic`, no su id). Los filtros sobre
> campos normales (`filter[year]`, `filter[gender]`, …) usan el valor tal cual.

| Página                        | Consulta al proxy                                                        |
| ----------------------------- | ------------------------------------------------------------------------ |
| `/`                           | `content/categories`, `content/laureates?include=category`               |
| `/categories`                 | `content/categories`, `content/laureates?include=category`               |
| `/categories/[key]`           | `content/categories/{slug}` + `content/laureates?filter[category]={slug}` |
| `/laureates`                  | `content/laureates?include=category`                                     |
| `/laureates/[slug]`           | `content/laureates/{slug}?include=category` + `filter[year]={año}`       |
| `/years`, `/years/[year]`     | `content/laureates?include=category`                                     |

### Verificar que el token no se filtra

Con el sitio en marcha, abre las **DevTools → Network** y navega: todas las
peticiones del navegador van a `/api/comet/...` **sin** encabezado
`Authorization`. El encabezado sólo aparece en la llamada servidor → Comet CMS.

---

## Solución de problemas

| Síntoma | Causa probable |
| ------- | -------------- |
| `401 unauthorized` / `Missing bearer token` | Falta `NUXT_COMET_API_TOKEN` o el token está revocado. |
| `403 forbidden` | El token no tiene `content.read` sobre la colección. |
| Listados vacíos | Las entradas están en `draft`: cámbialas a `published`. |
| `404 not_found` al importar | No existen los content types `categories` / `laureates`. |
| Los cambios del CMS no se ven en Netlify | Es un sitio estático: falta el Build hook + Webhook (§6). |
| La respuesta del CMS llega como HTML (`Unexpected token '<'`) | El _challenge_ de cookie del hosting no se resolvió: verifica la conexión a `cms-una.gt.tc`. |
| `508` o HTML con `googleTranslateElementInit` | El hosting gratuito del CMS alcanzó su **límite de recursos**. El proxy cachea las respuestas y reintenta con espera; si persiste, espera unos minutos y vuelve a intentar. |
