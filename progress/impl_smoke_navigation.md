# Implementación — smoke_navigation (feature 1, tag NAV)

- **Agente:** test-implementer
- **Fecha:** 2026-10-27
- **Spec:** `specs/smoke_navigation.md` (sin modificar)
- **Resultado:** GREEN (7/7, repeat-each=3 → 21/21)
- `feature_list.json` no se ha modificado (lo pidió así el leader); el estado
  `in_review` lo tiene que poner el leader.

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `tests/pages/Header.ts` | Nuevo. Page Object de la cabecera: barra superior (landmark `banner`) y menú principal (`navigation` que contiene "Catalog", fuera del banner) |
| `tests/pages/HomePage.ts` | Nuevo. `goto()` devuelve la `Response` del documento (para el 200 de NAV-01) |
| `tests/ui/smoke_navigation.spec.ts` | Nuevo. 7 tests, uno por escenario |

## Mapa escenario → test

| Escenario | Test (`tests/ui/smoke_navigation.spec.ts`) | Tags |
|-----------|--------------------------------------------|------|
| NAV-01 | `NAV-01 la home carga con el título y el logo de la tienda` | `@NAV-01 @ui` |
| NAV-02 | `NAV-02 catalog lleva al listado de productos` | `@NAV-02 @ui` |
| NAV-03 | `NAV-03 blog lleva a la página de noticias` | `@NAV-03 @ui` |
| NAV-04 | `NAV-04 about us lleva a la página informativa` | `@NAV-04 @ui` |
| NAV-05 | `NAV-05 search lleva a la página de búsqueda vacía` | `@NAV-05 @ui` |
| NAV-06 | `NAV-06 check out lleva a la página del carrito vacío` | `@NAV-06 @ui` |
| NAV-07 | `NAV-07 my cart (0) despliega el mini-carrito vacío sin salir de la página` | `@NAV-07 @ui` |

## Decisiones

- Los locators están acotados según los riesgos de la spec: "Search", "Check Out"
  y "My Cart (n)" se buscan dentro de `banner`; "Catalog", "Blog" y "About Us",
  dentro del menú principal. Así se evitan los duplicados del footer y de la barra superior.
- No hay selectores CSS. Todos los locators usan `getByRole` o `getByText`.
- NAV-05/NAV-06: "No search performed." e "It appears that your cart is
  currently empty!" forman parte de un párrafo más largo. Por eso `getByText`
  busca una subcadena y no usa `exact`. Coincide con el "se ve el texto" de la spec.
- NAV-07: antes del clic se comprueba que el enlace dice "My Cart (0)", que es
  la precondición de carrito vacío. Después se comprueba el texto del mini-carrito
  y que `pathname === "/"` (con o sin `#`).
- Sin `waitForTimeout`, `test.only` ni `test.skip`.

## Observaciones sobre la spec (para el triager/reviewer)

- No hay `SPEC_GAP` bloqueante. Un matiz: en NAV-05/06 el texto esperado es una
  frase dentro de un párrafo más largo, no un elemento independiente. En la
  primera ejecución fallaron NAV-05 y NAV-06 porque usé `exact: true`. Fue un
  TEST_BUG que ya está corregido.

## Comandos ejecutados y resultado real

```
npx playwright test --grep @NAV-          (1ª ejecución, exact: true)
  2 failed (NAV-05, NAV-06: getByText exact no encontrado), 5 passed
npx playwright test --grep @NAV-          (tras corregir locators)
  Running 7 tests using 2 workers
  7 passed (9.8s)
npx playwright test --grep @NAV- --repeat-each=3
  21 passed (28.3s)
node scripts/init.mjs
  [OK] Feature 1 (NAV): 7/7 escenarios cubiertos
  [OK] tsc --noEmit sin errores
  [OK] playwright test --list → Total: 7 tests in 1 file
  [OK] Entorno listo. Puedes empezar a trabajar.
```

Workers: 2 (config `playwright.config.ts`), dentro de la restricción del sitio.
