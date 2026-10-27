# Verificación — Cómo demostrar que el trabajo funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra** con comandos
> y su output real copiado en `progress/impl_<name>.md` / `review_<name>.md`.

## Niveles

### Nivel 0 — Arnés (siempre, segundos)

```bash
node scripts/init.mjs --fast   # estructura, backlog, specs, trazabilidad
```

Lo ejecuta automáticamente el hook `PostToolUse` tras cada Edit/Write.

### Nivel 1 — Tests de la feature (obligatorio)

```bash
npx playwright test --grep @CART-          # todos los escenarios de la feature
npx playwright test --grep @CART-03        # un escenario
```

### Nivel 2 — Estabilidad (obligatorio antes de `in_review`)

```bash
npx playwright test --grep @CART- --repeat-each=3
```

Un test que falla 1 de 3 veces es `FLAKY`, no verde.

### Nivel 3 — Arnés completo (obligatorio antes de `in_review` y de `done`)

```bash
node scripts/init.mjs          # + tsc --noEmit + playwright test --list
```

### Nivel 4 — Regresión completa (al cerrar sesión o antes de un release)

```bash
node scripts/init.mjs --full   # ejecuta toda la suite
```

## Evidencia de fallos (para el failure-triager)

- `test-results/results.json` — resultado estructurado de la última ejecución.
- `test-results/<test>/trace.zip` — `npx playwright show-trace <ruta>`.
- `playwright-report/` — `npx playwright show-report`.

## Anti-patrones

- ❌ "He escrito los tests, deberían pasar." → falta output real.
- ❌ Subir `retries` o `timeout` para que pase → eso esconde un `FLAKY`.
- ❌ Debilitar el assert respecto al **Entonces** de la spec.
- ❌ `test.skip` / `test.fail` sin entrada en `progress/bugs.md` o motivo escrito.
- ❌ Declarar `in_review` con `init.mjs` en rojo.
