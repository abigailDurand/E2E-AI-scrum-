#!/usr/bin/env node
// init.mjs — Verificación objetiva del arnés E2E.
//
// Modos:
//   node scripts/init.mjs          estructura + backlog + specs + trazabilidad + typecheck + discovery
//   node scripts/init.mjs --fast   solo estructura + backlog + specs + trazabilidad (segundos)
//   node scripts/init.mjs --full   todo lo anterior + ejecuta la suite E2E completa
//   node scripts/init.mjs --hook   igual que --fast; si falla escribe en stderr y sale con 2 (feedback al agente)
//   node scripts/init.mjs --stop-hook   igual que --hook, pero no bloquea dos veces seguidas
//
// El agente no dice "está bien": este script lo demuestra.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const STOP_HOOK = args.has("--stop-hook");
const HOOK = args.has("--hook") || STOP_HOOK;
const FAST = args.has("--fast") || HOOK;
const FULL = args.has("--full") && !FAST;

if (STOP_HOOK) {
  try {
    const input = JSON.parse(readFileSync(0, "utf8") || "{}");
    if (input.stop_hook_active) process.exit(0);
  } catch {
    // sin stdin válido: seguimos con la verificación normal
  }
}

const STATUSES = ["pending", "spec_ready", "in_progress", "in_review", "approved", "done", "blocked"];
// approved cuenta como activa: el PR sigue abierto hasta el merge.
const ACTIVE = ["in_progress", "in_review", "approved"];
const NEEDS_SPEC = ["spec_ready", "in_progress", "in_review", "approved", "done"];
const NEEDS_FULL_TRACE = ["in_review", "approved", "done"];
const NEEDS_REVIEW = ["approved", "done"];
const NEEDS_SPEC_APPROVAL = ["in_progress", "in_review", "approved", "done"];
const BASE_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "CHECKPOINTS.md",
  "feature_list.json",
  "progress/current.md",
  "progress/history.md",
  "progress/bugs.md",
  "docs/architecture.md",
  "docs/conventions.md",
  "docs/verification.md",
  "docs/spec-format.md",
  "docs/agent-flow.md",
  "specs/_TEMPLATE.md",
  "playwright.config.ts",
  "package.json",
];
const SCENARIO_ID = /^###\s+([A-Z][A-Z0-9]*-\d{2,3})\s+[—–-]\s+(.+)$/;
const TEST_TAG = /@([A-Z][A-Z0-9]*-\d{2,3})\b/g;

const buffer = [];
let failed = false;
const out = (m) => {
  buffer.push(m);
  if (!HOOK) console.log(m);
};
const ok = (m) => out(`[OK]    ${m}`);
const warn = (m) => out(`[WARN]  ${m}`);
const fail = (m) => {
  failed = true;
  out(`[FAIL]  ${m}`);
};
const section = (t) => out(`\n── ${t} ${"─".repeat(Math.max(0, 52 - t.length))}`);
// Quita el BOM: PowerShell 5.1 y algunos editores de Windows lo añaden y rompe JSON.parse.
const read = (path) => readFileSync(path, "utf8").replace(/^\uFEFF/, "");
const run = (cmd, inherit = false) =>
  spawnSync(cmd, { shell: true, encoding: "utf8", stdio: inherit ? "inherit" : "pipe" });

function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : walk(p, ext);
    return p.endsWith(ext) ? [p] : [];
  });
}

function parseSpec(text) {
  const frontmatter = {};
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    for (const line of fm[1].split(/\r?\n/)) {
      const i = line.indexOf(":");
      if (i > 0) frontmatter[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  const scenarios = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(SCENARIO_ID);
    if (h) {
      current = { id: h[1], title: h[2], steps: new Set() };
      scenarios.push(current);
      continue;
    }
    if (/^##?\s/.test(line)) {
      current = null;
      continue;
    }
    const step = current && line.match(/^\s*[-*]\s+\*\*(Dado|Cuando|Entonces|Y|Pero)\*\*/);
    if (step) current.steps.add(step[1]);
  }
  return { frontmatter, scenarios };
}

// ── 1. Entorno ─────────────────────────────────────────────
section("1. Entorno");
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 18) ok(`node ${process.versions.node}`);
else fail(`Se requiere Node >= 18 (tienes ${process.versions.node})`);

const depsInstalled = existsSync("node_modules/@playwright/test");
if (depsInstalled) ok("Dependencias instaladas (@playwright/test)");
else if (FAST) warn("Faltan dependencias: ejecuta `npm install`");
else fail("Faltan dependencias: ejecuta `npm install` y `npx playwright install chromium`");

// ── 2. Archivos base ───────────────────────────────────────
section("2. Archivos base del arnés");
const missing = BASE_FILES.filter((f) => !existsSync(f));
if (missing.length) missing.forEach((f) => fail(`Falta archivo base: ${f}`));
else ok(`${BASE_FILES.length} archivos base presentes`);

// ── 3. Backlog ─────────────────────────────────────────────
section("3. feature_list.json");
let features = [];
try {
  const backlog = JSON.parse(read("feature_list.json"));
  const rules = backlog.rules ?? {};
  features = backlog.features ?? [];
  const seen = { id: new Set(), name: new Set(), tag: new Set() };
  for (const f of features) {
    for (const key of ["id", "name", "tag", "status"]) {
      if (f[key] === undefined) fail(`Feature ${f.id ?? "?"} sin campo "${key}"`);
    }
    for (const key of ["id", "name", "tag"]) {
      if (seen[key].has(f[key])) fail(`Valor duplicado en "${key}": ${f[key]}`);
      seen[key].add(f[key]);
    }
    if (!STATUSES.includes(f.status)) fail(`Estado inválido en feature ${f.id}: ${f.status}`);
    if (NEEDS_SPEC.includes(f.status) && !existsSync(`specs/${f.name}.md`)) {
      fail(`Feature ${f.id} (${f.status}) no tiene spec: specs/${f.name}.md`);
    }
    if (NEEDS_REVIEW.includes(f.status)) {
      const review = `progress/review_${f.name}.md`;
      if (!existsSync(review)) fail(`Feature ${f.id} está ${f.status} sin ${review}`);
      else if (!/\*\*Veredicto:\*\*\s*APPROVED/.test(read(review))) {
        fail(`Feature ${f.id} está ${f.status} pero ${review} no dice APPROVED`);
      }
    }
    if (f.issue != null && !Number.isInteger(f.issue)) {
      fail(`Feature ${f.id}: "issue" debe ser un número de issue o null`);
    }
    if (rules.require_human_spec_approval && NEEDS_SPEC_APPROVAL.includes(f.status) && !f.spec_approved_by) {
      fail(`Feature ${f.id} está ${f.status} sin spec aprobada (spec_approved_by vacío)`);
    }
  }
  const active = features.filter((f) => ACTIVE.includes(f.status));
  if (active.length > 1) {
    fail(`Hay ${active.length} features activas (${active.map((f) => f.id).join(", ")}); máximo 1`);
  }
  const awaiting = features.filter((f) => f.status === "spec_ready" && !f.spec_approved_by);
  const maxAwaiting = rules.max_specs_awaiting_approval ?? Infinity;
  if (rules.require_human_spec_approval && awaiting.length > maxAwaiting) {
    fail(`Hay ${awaiting.length} specs esperando aprobación (${awaiting.map((f) => f.id).join(", ")}); máximo ${maxAwaiting}`);
  }
  const counts = STATUSES.map((s) => `${s}=${features.filter((f) => f.status === s).length}`);
  ok(`${features.length} features (${counts.join(" ")})`);
} catch (e) {
  fail(`feature_list.json inválido: ${e.message}`);
}

// ── 4. Specs ───────────────────────────────────────────────
section("4. Specs (formato Gherkin-like)");
const scenarioOwner = new Map();
const specsByFeature = new Map();
for (const f of features) {
  const path = `specs/${f.name}.md`;
  if (!existsSync(path)) continue;
  const { frontmatter, scenarios } = parseSpec(read(path));
  specsByFeature.set(f.name, scenarios);
  if (String(frontmatter.feature_id) !== String(f.id)) {
    fail(`${path}: feature_id "${frontmatter.feature_id}" no coincide con ${f.id}`);
  }
  if (frontmatter.tag !== f.tag) fail(`${path}: tag "${frontmatter.tag}" no coincide con ${f.tag}`);
  if (!scenarios.length) fail(`${path}: no tiene escenarios "### ${f.tag}-01 — ..."`);
  for (const s of scenarios) {
    if (!s.id.startsWith(`${f.tag}-`)) fail(`${path}: ${s.id} no usa el prefijo ${f.tag}-`);
    if (scenarioOwner.has(s.id)) fail(`${path}: ${s.id} duplicado (también en ${scenarioOwner.get(s.id)})`);
    scenarioOwner.set(s.id, path);
    for (const step of ["Dado", "Cuando", "Entonces"]) {
      if (!s.steps.has(step)) fail(`${path}: ${s.id} no tiene paso **${step}**`);
    }
  }
  if (scenarios.length) ok(`${path}: ${scenarios.length} escenarios`);
}
const knownSpecs = new Set(features.map((f) => `${f.name}.md`));
for (const file of existsSync("specs") ? readdirSync("specs") : []) {
  if (file.endsWith(".md") && file !== "_TEMPLATE.md" && !knownSpecs.has(file)) {
    warn(`specs/${file} no corresponde a ninguna feature del backlog`);
  }
}
if (!specsByFeature.size) ok("Aún no hay specs (normal si todo está pending)");

// ── 5. Trazabilidad spec ⇄ tests ───────────────────────────
section("5. Trazabilidad spec ⇄ tests");
const testFiles = walk("tests", ".ts");
const specFiles = testFiles.filter((p) => p.endsWith(".spec.ts"));
const tagsInTests = new Map();
for (const file of testFiles) {
  for (const m of read(file).matchAll(TEST_TAG)) {
    if (!tagsInTests.has(m[1])) tagsInTests.set(m[1], relative(".", file));
  }
}
for (const f of features) {
  const scenarios = specsByFeature.get(f.name);
  if (!scenarios || !["in_progress", ...NEEDS_FULL_TRACE].includes(f.status)) continue;
  const uncovered = scenarios.filter((s) => !tagsInTests.has(s.id)).map((s) => s.id);
  if (!uncovered.length) ok(`Feature ${f.id} (${f.tag}): ${scenarios.length}/${scenarios.length} escenarios cubiertos`);
  else if (NEEDS_FULL_TRACE.includes(f.status)) fail(`Feature ${f.id} sin test para: ${uncovered.join(", ")}`);
  else warn(`Feature ${f.id} en curso, faltan: ${uncovered.join(", ")}`);
}
for (const [tag, file] of tagsInTests) {
  if (!scenarioOwner.has(tag)) fail(`${file}: @${tag} no existe en ninguna spec (test huérfano)`);
}
ok(`${specFiles.length} archivos de test, ${tagsInTests.size} escenarios referenciados`);

// ── 6. Typecheck y discovery ───────────────────────────────
if (!FAST && depsInstalled) {
  section("6. TypeScript y discovery de Playwright");
  const tsc = run("npx tsc --noEmit");
  if (tsc.status === 0) ok("tsc --noEmit sin errores");
  else fail(`tsc --noEmit falló:\n${(tsc.stdout + tsc.stderr).trim()}`);

  if (specFiles.length) {
    const list = run("npx playwright test --list");
    const total = (list.stdout.match(/Total: .*/) ?? ["Total: ?"])[0];
    if (list.status === 0) ok(`playwright test --list → ${total}`);
    else fail(`playwright test --list falló:\n${(list.stdout + list.stderr).trim()}`);
  } else {
    warn("No hay tests todavía; se omite el discovery");
  }
}

// ── 7. Suite E2E completa ──────────────────────────────────
if (FULL && depsInstalled && specFiles.length) {
  section("7. Suite E2E completa");
  const e2e = run("npx playwright test", true);
  if (e2e.status === 0) ok("Suite E2E en verde");
  else fail("Suite E2E con fallos (ver test-results/results.json y playwright-report/)");
}

// ── Resumen ────────────────────────────────────────────────
section("Resumen");
if (!failed) ok(FAST ? "Verificación rápida OK" : "Entorno listo. Puedes empezar a trabajar.");
else fail("El arnés NO está sano. Resuelve los [FAIL] antes de avanzar.");

if (HOOK) {
  if (!failed) process.exit(0);
  process.stderr.write(`[harness] init.mjs detectó problemas:\n${buffer.filter((l) => l.startsWith("[FAIL]")).join("\n")}\n`);
  process.exit(2);
}
process.exit(failed ? 1 : 0);
