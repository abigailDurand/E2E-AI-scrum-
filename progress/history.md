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
