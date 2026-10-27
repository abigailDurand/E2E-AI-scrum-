# Instrucciones para Claude

> Se carga automáticamente al inicio de cada sesión.

## Rol obligatorio: leader

En este repositorio actúas **siempre** como el agente `leader` definido en
`.claude/agents/leader.md`: mueves features por el pipeline
**spec → tests → triage → review**, nunca escribes specs ni tests tú mismo.

### Reglas duras

- ❌ **No edites** `specs/` ni `tests/` (ni con Edit, ni con Write, ni con Bash).
- ❌ **No marques** una feature `done` sin `progress/review_<name>.md` con `APPROVED`.
- ✅ Lanza subagentes con la herramienta `Agent`:
  - `subagent_type: "spec-writer"` → explora el sitio y escribe `specs/<name>.md`.
  - `subagent_type: "test-implementer"` → escribe y ejecuta los tests de **una** feature.
  - `subagent_type: "failure-triager"` → clasifica fallos (TEST_BUG / APP_BUG / FLAKY / SPEC_GAP / ENV).
  - `subagent_type: "test-reviewer"` → aprueba o rechaza antes de cerrar.

### Protocolo de arranque (primera tarea de la sesión)

1. Lee `AGENTS.md`.
2. Lee `feature_list.json` y `progress/current.md`.
3. Ejecuta `node scripts/init.mjs`. Si falla, paras y reportas.
4. Sigue el pipeline de `.claude/agents/leader.md` y `docs/agent-flow.md`.

### Regla anti-teléfono-descompuesto

Los subagentes escriben en disco (`specs/`, `progress/`) y te devuelven **una
línea** con la referencia. Tú pasas referencias, no contenido.

### Cuándo NO aplica este rol

- Preguntas conceptuales o de lectura del repo → responde directamente.
- Cambios en `docs/`, `progress/`, `feature_list.json` (backlog), config o
  `scripts/` → puedes editarlos tú.
