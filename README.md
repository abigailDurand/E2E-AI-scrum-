# E2E Sauce Demo — Harness Engineering con agentes de test

Suite **E2E (UI + API)** de <https://sauce-demo.myshopify.com> en
**Playwright + TypeScript**, guiada por **specs Gherkin-like** y construida
por un pipeline de **agentes de IA** (Claude Code).

Basado en [betta-tech/ejemplo-harness-subagentes](https://github.com/betta-tech/ejemplo-harness-subagentes),
adaptado de "implementar features" a "especificar y automatizar pruebas".

## Los 3 pilares del arnés

| Pilar | En este repo |
|-------|--------------|
| **1. El repositorio ES el sistema** | `AGENTS.md`, `feature_list.json`, `specs/`, `progress/`, `docs/`, `scripts/init.mjs` |
| **2. Orquestación multi-agente** | `.claude/agents/`: leader, spec-writer, test-implementer, failure-triager, test-reviewer |
| **3. Supervisión objetiva** | `CHECKPOINTS.md`, trazabilidad spec⇄test en `init.mjs`, hooks en `.claude/settings.json` |

## El flujo de los agentes de test

```
pending ─▶ spec-writer ─▶ specs/<name>.md ─▶ test-implementer ─▶ tests + impl_<name>.md
                                                  ▲        │ red
                                                  │        ▼
                                        triage_<name>.md ◀─ failure-triager
                                                           │ green
                                                           ▼
                                          test-reviewer ─▶ review_<name>.md ─▶ done
```

Detalle completo en [`docs/agent-flow.md`](docs/agent-flow.md).

## Puesta en marcha

Requisitos: **Node.js ≥ 18** (LTS recomendado) y Claude Code.

```bash
npm install
npx playwright install chromium
node scripts/init.mjs        # debe terminar con [OK] Entorno listo
```

## Usarlo con Claude Code

1. Abre Claude Code en la raíz del repo (`claude`). `CLAUDE.md` lo pone en rol `leader`.
2. Pídele: **«avanza la siguiente feature del backlog»**.
3. Observa `specs/` y `progress/` mientras trabaja: ahí aparece cada informe.

| Archivo | Quién | Qué |
|---------|-------|-----|
| `specs/<name>.md` | spec-writer | Escenarios Dado/Cuando/Entonces con IDs `TAG-NN` |
| `progress/impl_<name>.md` | test-implementer | Mapa escenario→test + output real |
| `progress/triage_<name>.md` | failure-triager | Clasificación de cada fallo con evidencia |
| `progress/bugs.md` | failure-triager | Bugs reales del sitio |
| `progress/review_<name>.md` | test-reviewer | Veredicto + checklist |
| `progress/history.md` | leader | Bitácora append-only |

## Comandos útiles

```bash
npm run init:fast              # arnés en segundos
npm run test:api               # solo API
npm run test:ui                # solo UI
npx playwright test --grep @CART-    # una feature
npm run init:full              # arnés + regresión completa
npm run report                 # informe HTML
```

## Estructura

```
.
├── AGENTS.md / CLAUDE.md / CHECKPOINTS.md
├── feature_list.json          # backlog E2E + reglas + restricciones del sitio
├── specs/                     # una spec por feature (contrato)
├── tests/
│   ├── ui/  api/              # un test por escenario, tag @TAG-NN
│   ├── pages/                 # Page Objects
│   └── support/               # cliente API, tipos, fixtures
├── progress/                  # estado vivo e informes de agentes
├── docs/                      # agent-flow, spec-format, architecture, conventions, verification
├── scripts/init.mjs           # verificador objetivo
├── .claude/agents/  .claude/settings.json  .mcp.json
└── playwright.config.ts
```
