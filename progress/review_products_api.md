# Review — feature 2 `products_api`

**Veredicto:** APPROVED

- **Revisor:** test-reviewer
- **Fecha:** 2026-10-30
- **Rama:** `main` (runner Playwright, proyecto `api`)
- **Archivos revisados:** `tests/api/products_api.spec.ts`, `tests/support/shopifyApi.ts`,
  `tests/support/types.ts`, `specs/products_api.md`, `progress/impl_products_api.md`

## Trazabilidad

- [x] PAPI-01 → tests/api/products_api.spec.ts:24 — status 200 (:31), `content-type` contiene
  `application/json` (:32), objeto con `products` array (:35) y ≥ 1 elemento (:37); por producto
  `id` número, `title`/`handle` string no vacío, `variants` array ≥ 1 (:39-47); contiene Grey jacket
  con handle/title/id exactos (:49-55).
- [x] PAPI-02 → tests/api/products_api.spec.ts:59 — recorre todas las variantes (:65), `id`
  número, `price` con `^\d+\.\d{2}$` (:19, :70), `available` booleano (:71); variante 611945025
  `"55.00"`/`true` (:74-76) y 1063105029 `"20.00"`/`false` (:77-79).
- [x] PAPI-03 → tests/api/products_api.spec.ts:83 — verifica el **Dado** contra el listado
  (:89-98); 200 (:104), parseo JSON por texto (:105, shopifyApi.ts:22-24); id/title/handle
  (:106-108); exactamente una variante (:109) con id, `available: true` y `price: 5500`
  (:110-117).
- [x] PAPI-04 → tests/api/products_api.spec.ts:121 — una petición por handle, secuencial
  (`MAX_CONCURRENCY = 1`, :21, :132; spec permite ≤ 2); 200 por handle (:140); id/title/handle
  iguales (:143-146); conjunto de ids de variantes, `available` y precio ×100 en enteros
  comparados con `toEqual` sobre arrays ordenados por id (:148-162). Orden de `products` no
  asumido (indexado por la misma posición del listado propio).
- [x] PAPI-05 → tests/api/products_api.spec.ts:167 — verifica el **Dado** (:173-176), 404 (:180)
  y cuerpo vacío (:181).

5 escenarios en la spec, 5 tests, un `@ID` por test, ninguno huérfano. Ningún assert más débil
que el **Entonces**.

## Calidad

- [x] Forma de test conforme a `docs/conventions.md`: título `<ID> <comportamiento>`, tags
  `@PAPI-0x` + `@api`, `test.step` con texto de la spec en los pasos largos (:89, :100, :129, :173).
- [x] Sin `any` de TypeScript (la única coincidencia es `expect.any(Array)` en :35, matcher, no
  tipo). Respuestas tipadas en `tests/support/types.ts`.
- [x] Sin `waitForTimeout`, `test.only`, `test.skip` ni `test.fail` (no hay `APP_BUG`).
- [x] Sin URLs absolutas: todo relativo a `baseURL` (shopifyApi.ts:8, :17).
- [x] Precio comparado en céntimos enteros sin coma flotante (shopifyApi.ts:27-30), como pide la
  spec en Riesgos.
- [x] Aislamiento: cada test crea su `ShopifyApi` y pide sus propios datos; no hay estado
  compartido ni dependencia de orden (confirmado con `--repeat-each=3` en 2 workers).
- [x] Líneas ≤ 100 en los tres archivos (comprobado con awk, 0 líneas > 100).
- [x] Comentarios solo para *por qué* no obvio (spec.ts:20, shopifyApi.ts:21, :26).
- Locators / Page Objects: no aplica (feature de tipo `api`).

Observaciones no bloqueantes (no requieren cambio):
- tests/support/shopifyApi.ts:11-14 — `getProductsBody()` no comprueba el status; en PAPI-02/03/04/05
  un no-200 fallaría en `response.json()` con un mensaje menos claro. El status 200 del listado
  ya lo cubre PAPI-01.
- tests/api/products_api.spec.ts:140 — assert duro dentro del bucle: si un handle falla, no se
  informa del resto. `expect.soft` daría un diagnóstico más completo; no debilita el Entonces.
- tests/api/products_api.spec.ts:117 — redundante con :114 (ambos fijan 5500); inofensivo.

## Ejecución

Comandos ejecutados por el revisor (output real):

```
npx playwright test --grep @PAPI- --repeat-each=3
  Running 15 tests using 2 workers
  15 passed (13.7s)
  (PAPI-04 entre 3.2s y 3.5s por repetición; ningún 429)

node scripts/init.mjs
  [OK] 7 features (pending=5 spec_ready=0 in_progress=0 in_review=1 approved=0 done=1 blocked=0)
  [OK] specs/products_api.md: 5 escenarios
  [OK] Feature 2 (PAPI): 5/5 escenarios cubiertos
  [OK] tsc --noEmit sin errores
  [OK] playwright test --list → Total: 12 tests in 2 files
  [OK] Entorno listo. Puedes empezar a trabajar.
```

## Checkpoints

- **C1** — [x] archivos base presentes (init: 15/15) · [x] `init.mjs` verde.
- **C2** — [x] una sola feature en `in_review` · [x] spec existe · [x] `spec_approved_by:
  "abigailDurand"` · [x] specs esperando PO dentro de límite · [x] ninguna feature
  `approved`/`done` sin review (`smoke_navigation` tiene `review_smoke_navigation.md`) ·
  [x] `progress/current.md` modificado en la sesión activa.
- **C3** — [x] `feature_id: 2` / `tag: PAPI` coherentes · [x] IDs únicos con Dado/Cuando/Entonces ·
  [x] los 4 `acceptance` del backlog cubiertos (PAPI-01, PAPI-02, PAPI-03/04, PAPI-05) ·
  [x] Entonces verificables (códigos HTTP, valores concretos).
- **C4** — [x] un test por escenario · [x] sin huérfanos · [x] asserts no más débiles que el Entonces.
- **C5** — [x] `--repeat-each=3` verde (15/15) · [x] `tsc` y `--list` sin errores ·
  [x] sin `waitForTimeout`/`only`/`skip` · [x] locators/web-first: no aplica (API) ·
  [x] sin `test.fail()`.
- **C6** — [ ] `progress/history.md`: la entrada de cierre de sesión corresponde al leader (no
  bloqueante para esta review) · [x] sin artefactos sueltos (`test-results/`, `playwright-report/`
  en `.gitignore`) · [x] solo GET públicos, sin cuentas ni pagos.

## Cambios requeridos

Ninguno.
