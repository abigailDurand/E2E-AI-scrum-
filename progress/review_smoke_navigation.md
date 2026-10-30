# Review — feature 1 `smoke_navigation`

**Veredicto:** APPROVED

- **Agente:** test-reviewer
- **Fecha:** 2026-10-27
- **Revisado:** `specs/smoke_navigation.md`, `tests/ui/smoke_navigation.spec.ts`,
  `tests/pages/Header.ts`, `tests/pages/HomePage.ts`, `progress/impl_smoke_navigation.md`

## Trazabilidad

Un test por escenario, con tag `@NAV-NN` + `@ui`, sin huérfanos.

- [x] NAV-01 → tests/ui/smoke_navigation.spec.ts:5. Comprueba el status 200 del documento (:12),
      el título "Sauce Demo" (:13), que el img "Sauce Demo" se ve dentro del enlace del banner (:14),
      que el enlace tiene `href="/"` (:15) y que el heading del tagline se ve (:16, locator en Header.ts:24).
- [x] NAV-02 → :20. Clic en "Catalog" del menú principal. Comprueba la URL `/collections/all$` (:31),
      el título "Products – Sauce Demo" (:32) y el h1 "Products" con `level: 1` (:33).
- [x] NAV-03 → :38. Comprueba la URL `/blogs/news$` (:49), el título "News – Sauce Demo" (:50) y
      el enlace "First Post" dentro de un `article` (:51-53).
- [x] NAV-04 → :57. Comprueba la URL `/pages/about-us$` (:68), el título (:69) y el h1 "About Us" (:70).
      El locator va acotado al menú principal (Header.ts:33), así que no choca con el "About Us"
      de la barra superior ni con el del footer.
- [x] NAV-05 → :75. Clic en "Search" dentro del `banner`. Comprueba la URL `/search$` (:86),
      el título (:87), el h1 "Search Results" (:88) y el texto "No search performed." (:90).
- [x] NAV-06 → :94. Clic en "Check Out" dentro del `banner`. Comprueba la URL `/cart$` (:105),
      el título "Your Shopping Cart – Sauce Demo" (:106), el h1 "My Cart" (:107) y el texto de
      carrito vacío (:109-111).
- [x] NAV-07 → :115. Antes del clic comprueba el texto "My Cart (0)" (:123), que es la precondición
      de carrito vacío. Después comprueba que se ve "Your cart is empty." con `exact` (:127)
      y que la URL termina en `/` o en `/#` con pathname `/` (:128-129).

Ningún assert es más débil que el **Entonces** correspondiente. En NAV-05 y NAV-06, `getByText`
busca una subcadena y no usa `exact`. Está justificado: la frase forma parte de un párrafo más
largo (impl, "Decisiones") y coincide con el "se ve el texto" de la spec.

## Calidad

- [x] Locators por rol o texto. No hay `page.locator(...)` ni CSS/XPath en el spec ni en los
      Page Objects (comprobado con grep).
- [x] Asserts web-first. :12 (`response.status()`) y :129 (`pathname`) son asserts síncronos
      sobre valores ya resueltos. :129 se ejecuta después del `toHaveURL` web-first de :128,
      así que no hay carrera.
- [x] No hay `waitForTimeout`, `test.only`, `test.skip` ni `test.fail`.
- [x] Aislamiento: cada test crea su propio `HomePage` y navega a `/` con un contexto nuevo.
      No hay estado compartido. `fullyParallel: true` y `--repeat-each=3` pasaron en verde.
- [x] Los Page Objects (`Header.ts`, `HomePage.ts`) no contienen `expect` ni lógica condicional.
      Los locators son `readonly` y se crean en el constructor.
- [x] El comentario de Header.ts:18 justifica por qué se filtra `navigation` por "Catalog"
      (el menú principal está fuera del `banner`, según los riesgos de la spec).
- [x] No hay APP_BUG. `progress/bugs.md` sigue vacío, como corresponde.

Observaciones no bloqueantes:

1. `tests/pages/Header.ts` no sigue el patrón `<Nombre>Page.ts` de `docs/conventions.md`
   (tabla "Nombres"). Es un componente compartido y no una página, así que se acepta.
   Conviene documentar la convención para componentes (p. ej. `tests/pages/Header.ts`)
   en `docs/conventions.md`.
2. Los asserts de destino (h1 de cada página) se construyen inline en el spec. Es aceptable
   para un smoke test. Si las features 3, 4 o 5 los reutilizan, conviene moverlos a sus Page Objects.

## Ejecución

Comandos ejecutados por el revisor:

```
npx playwright test --grep @NAV- --repeat-each=3
  Running 21 tests using 2 workers
  21 passed (30.7s)   exit 0

node scripts/init.mjs
  [OK] 7 features (pending=6 ... in_review=1 ...)
  [OK] specs/smoke_navigation.md: 7 escenarios
  [OK] Feature 1 (NAV): 7/7 escenarios cubiertos
  [OK] tsc --noEmit sin errores
  [OK] playwright test --list → Total: 7 tests in 1 file
  [OK] Entorno listo.   exit 0
```

## Checkpoints

- **C1** [x] Archivos base presentes. [x] `init.mjs` termina con exit 0.
- **C2** [x] Solo hay una feature en `in_review`. [x] Existe la spec. [x] `spec_approved_by` = abigailDurand.
  [x] Límite de specs en espera respetado. [x] No hay features approved/done sin review.
  [x] `progress/current.md` describe la sesión activa.
- **C3** [x] `feature_id` 1 y tag NAV coinciden con el backlog. [x] IDs NAV-01..07 únicos, con Dado/Cuando/Entonces.
  [x] Los 3 criterios `acceptance` están cubiertos ("Cart" se cubre con NAV-06/07; la spec explica
  que no existe un enlace llamado literalmente "Cart"). [x] Los Entonces son verificables (URL, título, texto, HTTP 200).
- **C4** [x] Un test por escenario. [x] No hay tests huérfanos. [x] Ningún assert es más débil que su Entonces.
- **C5** [x] `--repeat-each=3` en verde (21/21). [x] `tsc` y `--list` sin errores. [x] No hay `waitForTimeout`/only/skip.
  [x] Locators por rol/texto y asserts web-first. [x] No hay `test.fail()`.
- **C6** (cierre de sesión; no bloquea esta review)
  [ ] `progress/history.md` todavía no tiene la entrada de esta sesión. La añade el leader al cerrar.
  [x] No hay artefactos fuera de `.gitignore` (`test-results/` y `playwright-report/` están ignorados).
  [x] Se respetan las restricciones: sin cuentas ni pagos, y `workers: 2`.

## Cambios requeridos

Ninguno.
