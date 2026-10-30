# Protocolo de comparación: Playwright vs `e2e` (agéntico)

> Este documento se fija **antes** de medir. Cambiar pesos, umbrales o features
> después de ver resultados invalida la comparación: si hay que cambiarlo,
> se versiona aquí con fecha y motivo y se repiten todas las mediciones.

- **Estado:** aprobado (2026-10-30, por la usuaria)
- **Fecha:** 2026-10-30
- **Rama base (Playwright):** `main`
- **Rama candidata (`e2e`):** `exp/e2e-agentic`
- **Versión candidata:** `e2e@0.21.3` (fijada; nunca `@latest`)

## 1. Pregunta e hipótesis

**Pregunta:** ¿reemplazar Playwright por `e2e` como runner del arnés mejora la
suite sin perder capacidad de detectar regresiones?

- **H0:** `e2e` no es mejor que Playwright en la puntuación ponderada (§5).
- **H1:** `e2e` supera los gates (§4) y obtiene mayor puntuación ponderada.

## 2. Variables controladas

Lo único que cambia entre ramas es **el runner de los tests**. Se mantiene igual:

| Variable | Valor |
|---|---|
| Features | las de `features.json` |
| Specs | el mismo commit de `specs/<name>.md` en ambas ramas |
| Pipeline | spec → tests → triage → review (`docs/agent-flow.md`) |
| Modelo de los subagentes | el mismo en ambas ramas (anotarlo en cada run) |
| Sitio objetivo | `https://sauce-demo.myshopify.com`, workers ≤ 2 |
| Máquina / Node | misma máquina, Node 26.x (anotar versión exacta; `e2e@0.21.3` exige Node `^22.22.3` o `>=24.8.0`) |
| Caché de repeticiones (`e2e`) | **activada** en las ejecuciones de medición (M1, M2, M6): `npx e2e run` sin `--no-cache` ni `--strict-cache`. Se parte de la caché que deja el pipeline al aprobar la feature y no se borra entre ejecuciones. El `--no-cache` solo se usa dentro del pipeline (`docs/verification.md`). Anotar en `notes` cuántos pasos se repitieron desde caché y cuántos fueron en vivo (línea `Cache` del resumen). |

## 3. Métricas

| # | Dimensión | Métrica | Cómo se mide |
|---|---|---|---|
| M1 | Eficacia | % de fallos inyectados detectados | Catálogo de fallos de §6; cada fallo se ejecuta 3 veces. Detectado = el test falla las 3. |
| M2 | Estabilidad | % flaky | 10 ejecuciones consecutivas sin cambios; flaky = test con resultado distinto entre ejecuciones. |
| M3 | Coste | € totales a 30 días de CI | Coste de generación (tokens del pipeline) + coste por ejecución × 30. Anotar también tiempo de ejecución medio. |
| M4 | Esfuerzo humano | nº de intervenciones | Rechazos de review + loops de triage + intervenciones humanas en checkpoints, por feature. |
| M5 | Trazabilidad | % escenarios trazables | Escenarios de la spec con un test identificable que los cubre. |
| M6 | Mantenimiento | ficheros/líneas a tocar | Se simula un cambio de UI (§6, F-M) y se mide el arreglo necesario. |

Tiempo de ejecución se registra pero no puntúa por separado (forma parte de M3).

## 4. Gates (eliminatorios)

Un runner que no pase **todos** los gates queda descartado, aunque puntúe más:

- **G1:** M1 ≥ 90 % de fallos inyectados detectados.
- **G2:** M2 ≤ 2 % flaky.
- **G3:** M5 = 100 % (todo escenario de la spec trazable).

> Motivo de G1: un runner agéntico puede "adaptarse" y dar verde donde debería
> fallar (falso verde). Es el riesgo principal del cambio.

## 5. Puntuación ponderada

Cada métrica se normaliza a 0–100 (100 = mejor de los dos; el otro proporcional).

| Métrica | Peso |
|---|---|
| M1 Eficacia | 35 % |
| M2 Estabilidad | 25 % |
| M3 Coste | 15 % |
| M4 Esfuerzo humano | 15 % |
| M6 Mantenimiento | 10 % |

M5 solo actúa como gate.

**Regla de decisión:**

1. Si solo uno pasa los gates → gana ese.
2. Si ambos pasan → gana el de mayor puntuación, **siempre que la diferencia sea ≥ 5 puntos**.
3. Diferencia < 5 puntos → empate técnico: se queda Playwright (coste de cambio).

## 6. Catálogo de fallos inyectados

Se inyectan sin tocar el sitio (es de terceros): interceptando red o
alterando la expectativa. El mecanismo concreto por runner se documenta en
`runs/<runner>/INYECCION.md`.

| ID | Feature | Fallo | Debe detectarse como |
|---|---|---|---|
| F-1 | smoke_navigation | Un enlace del header responde 404 | Fallo de navegación |
| F-2 | smoke_navigation | Se elimina el encabezado de la página destino | Fallo de contenido |
| F-3 | products_api | `/products.json` devuelve una variante sin `price` | Fallo de contrato |
| F-4 | products_api | `/products/<handle>.js` responde 500 | Fallo de status |
| F-5 | cart | `/cart/add.js` responde 200 pero `/cart.js` sigue vacío | Fallo de estado |
| F-6 | cart | El total no se actualiza al cambiar la cantidad | Fallo de cálculo |
| F-7 | cart | Producto agotado aparece como añadible | Fallo de regla de negocio |
| F-M | cualquiera | Cambio de texto/atributo de un botón usado por los tests | Mide M6 (no M1) |

## 7. Formato de cada ejecución

Un fichero por ejecución en `runs/<runner>/<feature>/run-NN.json`:

```json
{
  "runner": "playwright | e2e",
  "runner_version": "",
  "feature": "",
  "spec_commit": "",
  "model": "",
  "node": "",
  "date": "",
  "kind": "generation | stability | injection | maintenance",
  "fault_id": null,
  "tests_total": 0,
  "passed": 0,
  "failed": 0,
  "failed_tests": [],
  "duration_s": 0,
  "cost_eur": 0,
  "human_interventions": 0,
  "scenarios_total": 0,
  "scenarios_traced": 0,
  "files_changed": 0,
  "lines_changed": 0,
  "notes": ""
}
```

Qué rellena cada `kind`:

| `kind` | Cuándo | Campos que cuentan | Métrica |
|---|---|---|---|
| `generation` | Una por feature: el pipeline completo hasta `APPROVED` | `cost_eur` (tokens del pipeline), `human_interventions`, `scenarios_total`, `scenarios_traced` | M3, M4, M5 |
| `stability` | 10 por feature, sin cambios | `tests_total`, `failed_tests` (IDs `TAG-NN`), `duration_s`, `cost_eur` de la ejecución | M2, M3 |
| `injection` | 3 por fallo, con `fault_id` | `failed` (> 0 = detectado en esa ejecución) | M1 |
| `maintenance` | 1 por runner, `fault_id: "F-M"` | `files_changed`, `lines_changed` del arreglo | M6 |

`cost_eur` va en euros: si el proveedor cobra en USD, se convierte con el
cambio del día y se anota en `notes`.

El agregado lo hace `node scripts/compare.mjs`: lee `runs/`, aplica §4–§5 y
escribe `RESULTADOS.md`. Si faltan ejecuciones, el resultado sale como
**PROVISIONAL** y no declara ganador.

## 8. Procedimiento

1. Aprobar este protocolo (humano) y congelar `spec_commit` en `features.json`.
2. **Baseline** en `main`: pipeline completo con Playwright por feature; registrar M4/M5.
3. Ejecutar M2 (10 runs), M1 (catálogo §6) y M6 (F-M) con Playwright.
4. Crear `exp/e2e-agentic` desde `main`, adaptar el arnés y repetir 2–3 con `e2e`.
5. Agregar `runs/` en `RESULTADOS.md` y aplicar §4–§5.
6. Enlazar `RESULTADOS.md` en el PR draft; el humano decide merge o cierre.

## 9. Registro de cambios del protocolo

| Fecha | Cambio | Motivo |
|---|---|---|
| 2026-10-30 | Versión inicial | — |
| 2026-10-30 | Node 24.x → 26.x (§2) | La máquina de medición tiene Node 26.13.0 (LTS instalado para cumplir el requisito de `e2e@0.21.3`). Cambio hecho en borrador, antes de cualquier medición. |
| 2026-10-30 | Protocolo aprobado; `spec_commit` de `smoke_navigation` = `ad80296` | Aprobación humana. `products_api` y `cart` aún no tienen spec: su `spec_commit` se congela al aprobarse su spec, antes de medirlas. |
| 2026-10-30 | §7: `kind: generation` y campos `failed_tests`, `scenarios_*`, `files_changed`, `lines_changed`; agregado con `scripts/compare.mjs` | El formato inicial no guardaba los datos que necesitan M2 (qué test falla en cada ejecución), M4/M5 (pipeline) y M6. Sin mediciones todavía; métricas, pesos y gates no cambian. |
| 2026-10-30 | §2: caché de repeticiones de `e2e` activada en las mediciones | Decisión humana: medir `e2e` como se usaría a diario (más barato y estable). Contrapartida asumida: M1/M2 miden sobre todo la repetición grabada; cuando la pantalla cambia (inyección), el paso pasa al agente en vivo. Sin mediciones todavía. |
