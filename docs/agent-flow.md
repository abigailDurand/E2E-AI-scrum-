# Flujo de agentes de test

> Cómo se mueve una feature desde "idea en el backlog" hasta "suite verde,
> revisada y trazable". Cada flecha es un subagente lanzado por el `leader`;
> cada caja es un archivo en disco.

## Pipeline

```mermaid
flowchart TD
    B[feature_list.json<br/>status: pending] -->|leader lanza| SW[spec-writer<br/>explora sitio: Playwright MCP + JSON]
    SW -->|escribe| S[specs/name.md<br/>status: spec_ready]
    S -->|¿require_human_spec_approval?| H{Humano revisa spec}
    H -->|ok| TI
    S -->|no| TI[test-implementer<br/>Page Objects + tests @TAG-NN]
    TI -->|escribe| I[progress/impl_name.md]
    I -->|red| FT[failure-triager<br/>results.json + trazas + sitio real]
    FT -->|escribe| T[progress/triage_name.md]
    T -->|TEST_BUG / FLAKY| TI
    T -->|SPEC_GAP| SW
    T -->|APP_BUG → progress/bugs.md| TI
    T -->|ENV| X[para y avisa al humano]
    I -->|green · status: in_review| TR[test-reviewer<br/>trazabilidad + calidad + repeat-each]
    TR -->|escribe| R[progress/review_name.md]
    R -->|CHANGES_REQUESTED| TI
    R -->|APPROVED| D[leader: status done<br/>history.md]
```

## Quién toca qué

| Agente | Lee | Escribe | Estado que cambia |
|--------|-----|---------|-------------------|
| `leader` | todo | `progress/current.md`, `history.md`, `feature_list.json` | → `done` / `blocked` |
| `spec-writer` | backlog, sitio real | `specs/<name>.md` | `pending` → `spec_ready` |
| `test-implementer` | spec, docs, triage/review | `tests/**`, `progress/impl_<name>.md` | → `in_progress` → `in_review` |
| `failure-triager` | spec, impl, `test-results/`, sitio real | `progress/triage_<name>.md`, `progress/bugs.md` | — |
| `test-reviewer` | spec, tests, docs, CHECKPOINTS | `progress/review_<name>.md` | — |

Nadie se autoaprueba: quien escribe la spec no escribe el test, quien escribe
el test no lo aprueba, quien diagnostica no corrige.

## Bucle de corrección

- Cada vuelta `implementer → triager/reviewer → implementer` cuenta como un loop.
- Límite: `rules.max_fix_loops` en `feature_list.json` (por defecto 2).
- Superado el límite → `blocked` con explicación en `progress/current.md`.

## Las puertas objetivas (no dependen de lo que diga un agente)

| Puerta | Dónde se comprueba |
|--------|--------------------|
| Spec con formato válido | `init.mjs` §4 |
| Un test por escenario, sin huérfanos | `init.mjs` §5 |
| Tests compilan y Playwright los descubre | `init.mjs` §6 |
| `done` solo con review APPROVED | `init.mjs` §3 |
| Estabilidad | `--repeat-each=3` (implementer y reviewer) |
| Feedback inmediato al editar | hook `PostToolUse` → `init.mjs --hook` |
| No cerrar sesión con arnés roto | hook `Stop` → `init.mjs --stop-hook` |

## Cómo arrancarlo

En Claude Code, en la raíz del repo:

> «avanza la siguiente feature del backlog»

o, para una etapa concreta:

> «escribe solo la spec de la feature 5»
