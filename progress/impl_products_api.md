# Implementación — products_api (feature 2, tag PAPI)

- **Agente:** test-implementer
- **Fecha:** 2026-10-30
- **Spec:** `specs/products_api.md` (sin modificar)
- **Resultado:** GREEN (5/5, repeat-each=3 → 15/15, init.mjs verde)
- `feature_list.json`: `spec_ready` → `in_progress` → `in_review`.

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `tests/support/types.ts` | Nuevo. Tipos de `/products.json` (price string) y `/products/<handle>.js` (price entero en céntimos) |
| `tests/support/shopifyApi.ts` | Nuevo. `ShopifyApi` (rutas relativas, usa `baseURL`/`BASE_URL` del config), `parseProductDetail` (parsea texto: la ficha llega como `text/javascript`), `priceToCents` (sin coma flotante), `mapWithConcurrency` |
| `tests/api/products_api.spec.ts` | Nuevo. 5 tests, uno por escenario |

## Mapa escenario → test

| Escenario | Test (`tests/api/products_api.spec.ts`) | Tags |
|-----------|------------------------------------------|------|
| PAPI-01 | `PAPI-01 el listado de productos responde 200 con id, title, handle y variants` | `@PAPI-01 @api` |
| PAPI-02 | `PAPI-02 cada variante del listado tiene id, price y available` | `@PAPI-02 @api` |
| PAPI-03 | `PAPI-03 la ficha de un producto por handle coincide con su entrada del listado` | `@PAPI-03 @api` |
| PAPI-04 | `PAPI-04 todos los productos del listado son coherentes con su ficha por handle` | `@PAPI-04 @api` |
| PAPI-05 | `PAPI-05 un handle inexistente responde 404` | `@PAPI-05 @api` |

## Decisiones

- Ninguna URL absoluta en los tests: todas las peticiones son relativas al
  `baseURL` de `playwright.config.ts` (`BASE_URL`), así que funcionan a través del proxy.
- PAPI-04 hace las peticiones **en secuencia** (`MAX_CONCURRENCY = 1`). La spec
  permite secuencial o concurrencia ≤ 2. En la primera ejecución, con concurrencia 2
  (y otros tests en el segundo worker), `/products/noir-jacket.js` devolvió
  **429**. Bajar a secuencial respeta mejor el sitio y quita el rate limiting.
  No se reintenta el 429, porque eso escondería un fallo real.
- Comparación de variantes en PAPI-04: se ordenan por `id`, y se compara
  `{id, available, price}` con `priceToCents(listado)` frente a `price` de la ficha.
  `toEqual` sobre los arrays ordenados comprueba a la vez que el conjunto de ids
  coincide y los valores de cada variante.
- PAPI-03 y PAPI-05 comprueban explícitamente su **Dado** contra `/products.json`.
- El orden de `products` no se asume (se busca por handle o id).

## Observaciones sobre la spec

- Ningún `SPEC_GAP`. Solo un matiz operativo: con concurrencia 2 Shopify
  puede responder 429 (lo menciona el apartado de riesgos de la spec). Se usa secuencial.

## Comandos ejecutados y resultado real

```
npx tsc --noEmit                                  → sin errores
npx playwright test --grep @PAPI-                 (1ª, concurrencia 2 en PAPI-04)
  1 failed (PAPI-04: status de /products/noir-jacket.js Expected 200, Received 429)
  4 passed (4.4s)
npx playwright test --grep @PAPI-                 (PAPI-04 secuencial)
  5 passed (6.1s)
npx playwright test --grep @PAPI- --repeat-each=3
  15 passed (14.7s)
-- tras ajustes de estilo (tipo importado, línea > 100, comentario) --
npx playwright test --grep @PAPI-
  5 passed (13.1s)
npx playwright test --grep @PAPI- --repeat-each=3
  15 passed (13.8s)
node scripts/init.mjs
  [OK] Feature 2 (PAPI): 5/5 escenarios cubiertos
  [OK] tsc --noEmit sin errores
  [OK] playwright test --list → Total: 12 tests in 2 files
  [OK] Entorno listo. Puedes empezar a trabajar.
```
