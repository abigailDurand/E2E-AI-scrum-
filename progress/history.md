# Bitácora histórica (append-only)

> Al cerrar cada sesión se añade su resumen aquí. No se editan entradas anteriores.

---

## 2026-10-27 — Bootstrap del arnés E2E
- **Agente:** humano + Claude.
- **Cambios:** estructura del arnés adaptada de `betta-tech/ejemplo-harness-subagentes`
  a E2E con specs: `AGENTS.md`, `CLAUDE.md`, `CHECKPOINTS.md`, `feature_list.json`
  (7 features), `docs/`, `specs/_TEMPLATE.md`, 5 agentes en `.claude/agents/`,
  `scripts/init.mjs`, hooks y config de Playwright.
- **Verificación:** Node 24.22.1, `npm install` + Chromium instalados. `node scripts/init.mjs`
  verde. Puertas probadas en una copia desechable: detecta spec sin **Entonces**, escenario
  sin test, test huérfano, `done` sin spec/review; camino feliz verde con `tsc` y `--list`.
- **Corrección:** `init.mjs` ahora tolera BOM UTF-8 (PowerShell 5.1 lo añade y rompía JSON.parse).
- **Resultado:** arnés listo; 7 features en `pending`.

## 2026-10-27 — Feature 1 `smoke_navigation` (NAV) → approved
- **Agente:** leader (spec-writer → test-implementer → test-reviewer).
- **Sprint planning:** issue #1 creado con etiqueta `sprint`; `issue: 1` en `feature_list.json`.
- **Spec:** `specs/smoke_navigation.md`, 7 escenarios NAV-01..NAV-07. El header no tiene enlace
  "Cart": se cubre con "Check Out" → `/cart` (NAV-06) y el desplegable "My Cart (0)" (NAV-07).
  Aprobada por abigailDurand (`spec_approved_by`).
- **Tests:** `tests/ui/smoke_navigation.spec.ts` + Page Objects `tests/pages/Header.ts`, `HomePage.ts`.
  Green 7/7, `repeat-each=3` estable → `progress/impl_smoke_navigation.md`. Loops de corrección: 0/2.
- **Review:** APPROVED → `progress/review_smoke_navigation.md`.
- **Resultado:** feature 1 `approved`; issue #1 `status:approved`. Pendiente: PR con `Closes #1` y merge → `done`.
