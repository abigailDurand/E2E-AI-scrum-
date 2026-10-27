# AGENTS.md — Mapa de navegación para agentes de IA

> Punto de entrada para cualquier agente. Es un **mapa**, no una biblia:
> lee solo lo que necesites cuando lo necesites (divulgación progresiva).

**Qué es este repo:** suite E2E (UI + API) de
`https://sauce-demo.myshopify.com` escrita en **Playwright + TypeScript**,
guiada por **specs Gherkin-like** y construida por un pipeline de agentes.

---

## 1. Antes de empezar (obligatorio)

1. `node scripts/init.mjs` → debe terminar sin `[FAIL]`. Si falla, **para**.
2. Lee `progress/current.md` (en qué quedó la última sesión).
3. Lee `feature_list.json`: trabaja en **una** feature a la vez.

## 2. Mapa del repositorio

| Archivo / carpeta | Qué contiene | Cuándo leerlo |
|-------------------|--------------|---------------|
| `feature_list.json` | Backlog E2E, estados, reglas y restricciones del sitio | Siempre |
| `progress/current.md` | Estado vivo de la sesión | Siempre |
| `docs/agent-flow.md` | Pipeline de agentes y máquina de estados | Si orquestas |
| `docs/spec-format.md` | Formato obligatorio de las specs | Antes de escribir/leer una spec |
| `docs/architecture.md` | Sistema bajo prueba y capas de la suite | Antes de escribir tests |
| `docs/conventions.md` | Locators, asserts, nombres, Page Objects | Antes de escribir tests |
| `docs/verification.md` | Cómo demostrar que un test es correcto y estable | Antes de declarar `in_review` |
| `CHECKPOINTS.md` | Criterios objetivos de estado final | Para revisar |
| `specs/` | Una spec por feature (`specs/<name>.md`) | Para implementar o revisar |
| `tests/ui/`, `tests/api/` | Tests Playwright | Para implementar |
| `tests/pages/` | Page Objects (UI) | Para implementar |
| `tests/support/` | Helpers de API y datos | Para implementar |
| `progress/impl_*`, `triage_*`, `review_*` | Informes de cada subagente | Para seguir la traza |
| `progress/bugs.md` | Bugs reales del sitio detectados (append-only) | Ante un `APP_BUG` |
| `progress/history.md` | Bitácora append-only | Contexto histórico |
| `scripts/init.mjs` | Verificador objetivo del arnés | Siempre |
| `.claude/agents/` | Definición de los 5 agentes | Si orquestas |

## 3. Reglas duras (no negociables)

- **Una feature activa a la vez** (`in_progress` / `in_review`).
- **Spec antes que tests.** Sin `specs/<name>.md` no hay tests.
- **Trazabilidad 1:1.** Cada escenario `TAG-NN` tiene un test con `@TAG-NN`;
  ningún test referencia un ID inexistente. `init.mjs` lo comprueba.
- **Nada es `done` sin review `APPROVED`** y `init.mjs` verde.
- **Respeta el sitio:** no crear cuentas, no pagar, workers ≤ 2.
- **Si no sabes algo, busca en `docs/`** antes de inventarlo.

## 4. Máquina de estados

```
pending ──spec-writer──▶ spec_ready ──test-implementer──▶ in_progress
                                                            │  red ▶ failure-triager ▶ (fix loop)
                                                            ▼ green
                                                         in_review ──test-reviewer──▶ done
cualquier estado ──(bloqueo / max_fix_loops)──▶ blocked
```

## 5. Cierre de sesión

1. `node scripts/init.mjs` → verde.
2. Feature cerrada en su estado correcto.
3. Resumen de `progress/current.md` → final de `progress/history.md`.
4. `progress/current.md` vuelve a la plantilla.
5. Sin `test.only`, sin archivos temporales, sin TODOs sin contexto.

## 6. Si te bloqueas

No inventes un workaround. Documenta el bloqueo en `progress/current.md`,
marca la feature `blocked` si aplica y para.
