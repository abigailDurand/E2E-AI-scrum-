# CHECKPOINTS — Evaluación del estado final

> No se evalúa el camino, se evalúa el destino. Un juez (humano o IA) usa
> estos checkpoints para decidir si la suite está sana.
> Los marcados con ⚙ los comprueba `scripts/init.mjs` automáticamente.

## C1 — El arnés está completo

- [ ] ⚙ Existen los archivos base (`AGENTS.md`, `CLAUDE.md`, `feature_list.json`,
      `progress/`, `docs/`, `specs/_TEMPLATE.md`, `playwright.config.ts`).
- [ ] ⚙ `node scripts/init.mjs` termina con exit code 0.

## C2 — El estado es coherente

- [ ] ⚙ Como mucho una feature en `in_progress` / `in_review`.
- [ ] ⚙ Toda feature desde `spec_ready` tiene `specs/<name>.md`.
- [ ] ⚙ Toda feature `done` tiene `progress/review_<name>.md` con `APPROVED`.
- [ ] `progress/current.md` describe la sesión activa o está en plantilla.

## C3 — Las specs son ejecutables

- [ ] ⚙ Cada spec tiene `feature_id` y `tag` coherentes con el backlog.
- [ ] ⚙ Cada escenario tiene ID único `TAG-NN` y pasos Dado / Cuando / Entonces.
- [ ] Cada `acceptance` del backlog está cubierto por algún escenario.
- [ ] Los **Entonces** son verificables (texto, URL, número, código HTTP).

## C4 — Trazabilidad spec ⇄ test

- [ ] ⚙ Toda feature `in_review` / `done` tiene un test por escenario (`@TAG-NN`).
- [ ] ⚙ No hay tests huérfanos (tags que no existen en ninguna spec).
- [ ] Cada test verifica lo que dice su **Entonces**, no algo más débil.

## C5 — La verificación es real y estable

- [ ] Los tests de la feature pasan con `--repeat-each=3`.
- [ ] ⚙ `tsc --noEmit` y `playwright test --list` sin errores.
- [ ] Sin `waitForTimeout`, `test.only` ni `test.skip` injustificados.
- [ ] Locators por rol/label/texto; asserts web-first.
- [ ] Todo `test.fail()` referencia un `BUG-00x` de `progress/bugs.md`.

## C6 — La sesión se cerró bien

- [ ] `progress/history.md` tiene una entrada de la última sesión.
- [ ] No quedan artefactos sueltos fuera de `.gitignore`.
- [ ] Se respetaron `target.constraints` (sin cuentas reales, sin pagos).

---

**Uso:** el `test-reviewer` recorre cada checkbox en su informe y rechaza el
cierre si quedan casillas vacías en C1-C5 relacionadas con la feature.
