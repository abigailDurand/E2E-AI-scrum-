# Arquitectura — Qué significa "hacer un buen trabajo"

> Los revisores evalúan contra este archivo. Si no está aquí, no es requisito.

## Sistema bajo prueba

- **URL:** `https://sauce-demo.myshopify.com` (configurable con `BASE_URL`).
- Tienda Shopify de demo: home, catálogo (`/collections/all`), ficha
  (`/products/<handle>`), búsqueda (`/search`), carrito (`/cart`),
  cuenta (`/account/login`, `/account/register`), blog, About Us.
- **API pública de Storefront (AJAX):** `/products.json`, `/products/<handle>.js`,
  `/cart.js`, `/cart/add.js`, `/cart/change.js`, `/cart/clear.js`.
- Es un sitio **de terceros**: no lo controlamos, puede cambiar. Por eso la
  spec se basa en lo observado y el triager distingue `APP_BUG` de `ENV`.

## Capas de la suite (y solo estas)

```
specs/<name>.md            contrato (qué se prueba)
      │
tests/ui/<name>.spec.ts    un test por escenario UI  ──▶ tests/pages/*.ts   (Page Objects)
tests/api/<name>.spec.ts   un test por escenario API ──▶ tests/support/*.ts (cliente API, datos)
      │
playwright.config.ts       proyectos: api (sin navegador), ui-chromium
```

1. **Tests**: orquestan pasos y contienen **todas** las aserciones.
2. **Page Objects** (`tests/pages/`): una clase por página/componente
   (`HomePage`, `ProductPage`, `CartPage`, `Header`). Exponen locators y
   acciones de negocio (`addToCart()`), nunca `expect`.
3. **Support** (`tests/support/`): cliente tipado de la API AJAX de Shopify,
   tipos de respuesta y datos de prueba obtenidos de la API (no hardcodeados
   cuando se pueden leer).
4. **Fixtures** (`tests/support/fixtures.ts`): extienden `test` para inyectar
   Page Objects. Se crea cuando haya ≥2 specs UI que lo necesiten.

## Principios

- **UI + API se refuerzan:** la UI hace la acción; la API verifica el estado
  (p. ej. añadir en UI → comprobar `/cart.js` con el mismo contexto/cookies vía `page.request`).
- **Aislamiento:** cada test arranca con contexto nuevo (carrito vacío). Nada
  de depender del orden.
- **Datos desde la fuente:** precios, handles y disponibilidad se leen de
  `/products.json` cuando el escenario lo permita.
- **Sin dependencias extra** más allá de `@playwright/test` y `typescript`.
  Añadir una requiere marcar la feature `blocked` y justificarlo.

## Qué NO hacer

- No crear cuentas, no enviar pagos, no lanzar carga (ver `target.constraints`).
- No poner aserciones dentro de Page Objects.
- No compartir estado entre tests (variables globales, carritos reutilizados).
- No usar esperas fijas.
