---
feature_id: 2
name: products_api
tag: PAPI
type: api
author: spec-writer
---

# Contrato de la API de productos

## Contexto

Valida como contrato de datos los endpoints públicos de productos de la tienda
Shopify `https://sauce-demo.myshopify.com`: el listado `/products.json` y la
ficha individual `/products/<handle>.js`. Si cambian la forma o la coherencia de
estos datos, el catálogo (UI) puede romperse sin que nadie lo note. Explorado con
curl el 2026-10-30: `/products.json` responde 200 (`application/json`) con un
objeto `{ "products": [...] }` de 7 productos; `/products/<handle>.js` responde
200 (`text/javascript`, cuerpo JSON) y un handle inexistente responde 404 con
cuerpo vacío.

## Datos de prueba

| Dato | Valor | Origen |
|------|-------|--------|
| producto disponible, 1 variante | Grey jacket (`grey-jacket`), id `263739389`, variante `611945025`, price `"55.00"`, `available: true` | /products.json |
| producto agotado | Brown Shades (`brown-shades`), id `407143389`, variante `1063105029`, price `"20.00"`, `available: false` | /products.json |
| producto con varias variantes | Noir jacket (`noir-jacket`), 6 variantes a `"60.00"` | /products.json |
| handle inexistente | `no-existe-xyz-123` | inventado, comprobado 404 |

## Escenarios

### PAPI-01 — El listado de productos responde 200 con productos que tienen id, title, handle y variants

- **Tipo:** api
- **Prioridad:** alta
- **Criterio cubierto:** /products.json responde 200 con un array de productos con id, title, handle y variants
- **Dado** el endpoint público `GET /products.json`
- **Cuando** se hace la petición sin parámetros
- **Entonces** responde 200 con `Content-Type` que contiene `application/json`
- **Y** el cuerpo es un objeto con la clave `products`, que es un array con al menos 1 elemento
- **Y** cada producto tiene `id` numérico, `title` string no vacío, `handle` string no vacío y `variants` array con al menos 1 elemento
- **Y** el array contiene un producto con `handle: "grey-jacket"`, `title: "Grey jacket"` e `id: 263739389`

### PAPI-02 — Cada variante del listado tiene id, price y available

- **Tipo:** api
- **Prioridad:** alta
- **Criterio cubierto:** Cada variante tiene id, price y available
- **Dado** la respuesta de `GET /products.json`
- **Cuando** se recorren todas las variantes de todos los productos
- **Entonces** cada variante tiene `id` numérico, `price` string con formato decimal de dos decimales (patrón `^\d+\.\d{2}$`) y `available` booleano
- **Y** la variante de "Grey jacket" (`id: 611945025`) tiene `price: "55.00"` y `available: true`
- **Y** la variante de "Brown Shades" (`id: 1063105029`) tiene `price: "20.00"` y `available: false`

### PAPI-03 — La ficha de un producto por handle coincide con su entrada del listado

- **Tipo:** api
- **Prioridad:** alta
- **Criterio cubierto:** /products/<handle>.js devuelve el mismo producto que el listado
- **Dado** que `/products.json` contiene "Grey jacket" (`grey-jacket`) con `id: 263739389` y una variante `611945025` a `"55.00"`
- **Cuando** se hace `GET /products/grey-jacket.js`
- **Entonces** responde 200 y el cuerpo se parsea como JSON
- **Y** `id` es `263739389`, `title` es `"Grey jacket"` y `handle` es `"grey-jacket"`
- **Y** `variants` contiene exactamente una variante con `id: 611945025`, `available: true` y `price: 5500` (céntimos: `"55.00"` del listado × 100)

### PAPI-04 — Todos los productos del listado son coherentes con su ficha por handle

- **Tipo:** api
- **Prioridad:** media
- **Criterio cubierto:** /products/<handle>.js devuelve el mismo producto que el listado
- **Dado** la lista de productos de `GET /products.json`
- **Cuando** se hace `GET /products/<handle>.js` para cada `handle` del listado (peticiones secuenciales o con concurrencia ≤ 2)
- **Entonces** cada petición responde 200
- **Y** para cada producto coinciden `id`, `title` y `handle` entre listado y ficha
- **Y** el conjunto de `id` de variantes es el mismo en listado y ficha, y para cada variante coincide `available` y `price` de la ficha es igual a `price` del listado × 100 (p. ej. `"39.99"` → `3999`)

### PAPI-05 — Un handle inexistente responde 404

- **Tipo:** api
- **Prioridad:** alta
- **Criterio cubierto:** Un handle inexistente responde 404
- **Dado** que ningún producto de `/products.json` tiene el handle `no-existe-xyz-123`
- **Cuando** se hace `GET /products/no-existe-xyz-123.js`
- **Entonces** responde con código HTTP 404
- **Y** el cuerpo de la respuesta está vacío

## Fuera de alcance

- Paginación y parámetros de `/products.json` (`limit`, `page`): el catálogo cabe en una página (7 productos).
- Campos no contractuales (`body_html`/`description`, imágenes, fechas, `tags`, `vendor`).
- Coherencia API ↔ UI del catálogo y precios mostrados: feature `catalog_ui`.
- Endpoints de carrito (`/cart*.js`): feature `cart`.

## Riesgos / observaciones

- **Formato de precio distinto entre endpoints:** en `/products.json` `variants[].price` es string con decimales (`"55.00"`); en `/products/<handle>.js` es entero en céntimos (`5500`). Los escenarios comparan aplicando ×100; comparar en céntimos enteros para evitar errores de coma flotante (p. ej. `"39.99"` → `3999`).
- `/products/<handle>.js` responde con `Content-Type: text/javascript; charset=utf-8` aunque el cuerpo es JSON: parsear el cuerpo como texto/JSON sin depender de la cabecera. El 404 también llega como `text/javascript` con `Content-Length: 0`.
- El handle no siempre deriva del título: `flower-print-jeans` tiene `title: "Black heels"`. No asumir handle = slug(title).
- Los datos son de un sitio de terceros: el número de productos (7 observados), precios o disponibilidad pueden cambiar. Los valores concretos de Grey jacket / Brown Shades se fijan como datos de referencia; si cambian, es un cambio de datos a triar (posible SPEC_GAP), no necesariamente un bug.
- El orden del array de `products` no se considera contractual.
- Shopify puede aplicar rate limiting (429) ante muchas peticiones seguidas; PAPI-04 hace 1 + 7 peticiones, mantener concurrencia ≤ 2.
