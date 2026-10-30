#!/usr/bin/env node
// measure.mjs — Ejecuta una medición del protocolo y escribe su run-NN.json.
//
// Uso:
//   node scripts/measure.mjs <runner> <feature> control
//   node scripts/measure.mjs <runner> <feature> stability [--repeat 10]
//   node scripts/measure.mjs <runner> <feature> injection --fault F-1 [--repeat 3]
//   node scripts/measure.mjs <runner> <feature> maintenance [--record]
//   node scripts/measure.mjs <runner> <feature> generation --interventions N [--cost-eur X]
//
// Opciones: --out <dir> (por defecto comparison/runs), --port <n> (8787),
//           --price-in / --price-cached / --price-out (USD por 1M tokens) y --usd-eur <tasa>
//           para calcular cost_eur de e2e a partir de los tokens del informe.
//
// Todo pasa por scripts/fault-proxy.mjs (PROTOCOLO.md §2). No toca tests/ ni specs/.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [runner, feature, kind, ...rest] = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : fallback;
};
const flag = (name) => rest.includes(name);

const KINDS = ["control", "stability", "injection", "maintenance", "generation"];
const DEFAULT_REPEAT = { control: 1, stability: 10, injection: 3, maintenance: 1, generation: 1 };
const OUT = opt("--out", "comparison/runs");
const PORT = Number(opt("--port", 8787));
const PROXY = `http://127.0.0.1:${PORT}`;

// Quita el BOM: PowerShell 5.1 y algunos editores de Windows lo añaden y rompe JSON.parse.
const readJson = (path) => JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
const die = (msg) => {
  console.error(`[measure] ${msg}`);
  process.exit(1);
};
const say = (msg) => console.log(`[measure] ${msg}`);

// ── Validación ────────────────────────────────────────────
if (!["playwright", "e2e"].includes(runner) || !feature || !KINDS.includes(kind)) {
  die("uso: node scripts/measure.mjs <playwright|e2e> <feature> <control|stability|injection|maintenance|generation> [opciones]");
}
const comparison = readJson("comparison/features.json");
const runnerInfo = Object.values(comparison.runners).find((r) => r.name === runner);
const featureInfo = comparison.features.find((f) => f.name === feature);
if (!featureInfo) die(`"${feature}" no está en comparison/features.json`);
if (!featureInfo.spec_commit) die(`"${feature}" no tiene spec_commit congelado en comparison/features.json`);

const branch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).stdout.trim();
if (branch !== runnerInfo.branch) die(`${runner} se mide en la rama ${runnerInfo.branch}; estás en ${branch}`);

const backlog = readJson("feature_list.json").features.find((f) => f.name === feature);
const TAG = backlog.tag;

let fault = "none";
if (kind === "injection") {
  fault = opt("--fault");
  if (!featureInfo.faults.includes(fault)) {
    die(`--fault debe ser uno de ${featureInfo.faults.join(", ")} para ${feature} (recibido: ${fault})`);
  }
}
if (kind === "maintenance") fault = "F-M";
const repeat = Number(opt("--repeat", DEFAULT_REPEAT[kind]));

// ── Datos comunes del run ─────────────────────────────────
// Busca node_modules hacia arriba, como hace Node (un worktree lo hereda de la carpeta padre).
function pkgVersion(name) {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const path = join(dir, "node_modules", name, "package.json");
    if (existsSync(path)) return readJson(path).version;
    if (dirname(dir) === dir) return "";
  }
}
const base = () => ({
  runner,
  runner_version: runner === "e2e" ? pkgVersion("e2e") : pkgVersion("@playwright/test"),
  feature,
  spec_commit: featureInfo.spec_commit,
  model: "",
  node: process.versions.node,
  date: new Date().toISOString().slice(0, 10),
  kind,
  fault_id: kind === "injection" || kind === "maintenance" ? fault : null,
  tests_total: 0,
  passed: 0,
  failed: 0,
  failed_tests: [],
  duration_s: 0,
  cost_eur: 0,
  human_interventions: 0,
  scenarios_total: 0,
  scenarios_traced: 0,
  files_changed: 0,
  lines_changed: 0,
  notes: "",
});

function writeRun(run) {
  const dir = join(OUT, runner, feature);
  mkdirSync(dir, { recursive: true });
  const used = readdirSync(dir).map((n) => n.match(/^run-(\d+)\.json$/)?.[1]).filter(Boolean).map(Number);
  const next = String(Math.max(0, ...used) + 1).padStart(2, "0");
  const path = join(dir, `run-${next}.json`);
  writeFileSync(path, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  say(`→ ${path}`);
}

// ── Proxy ─────────────────────────────────────────────────
let proxy = null;
let suite = null;
const cleanup = () => {
  suite?.kill();
  proxy?.kill();
};
process.on("SIGINT", () => {
  cleanup();
  die("interrumpido: no se guarda la ejecución en curso");
});

function startProxy(id) {
  return new Promise((resolve, reject) => {
    proxy = spawn(process.execPath, ["scripts/fault-proxy.mjs", id], { env: { ...process.env, PORT: String(PORT) } });
    let log = "";
    const timer = setTimeout(() => reject(new Error(`el proxy no arrancó en 15 s:\n${log}`)), 15_000);
    proxy.stderr.on("data", (chunk) => {
      log += chunk;
      const m = log.match(/\[fault-proxy ([^\]]+)\] escuchando/);
      if (!m) return;
      clearTimeout(timer);
      // El proxy imprime el fallo en mayúsculas ("NONE", "F-1").
      if (m[1] !== id.toUpperCase()) reject(new Error(`el proxy arrancó con ${m[1]}, no con ${id}`));
      else resolve();
    });
    proxy.on("exit", (code) => {
      clearTimeout(timer);
      if (/EADDRINUSE/.test(log)) reject(new Error(`el puerto ${PORT} está ocupado: cierra el otro proxy (Ctrl+C)`));
      else reject(new Error(`el proxy terminó (código ${code}):\n${log}`));
    });
  });
}

// ── Ejecución de la suite y lectura del informe ───────────
const REPORT = runner === "e2e" ? ".e2e/report.json" : "test-results/results.json";
const ID = /^([A-Z][A-Z0-9]*-\d{2,3})\b/;

function runSuite() {
  rmSync(REPORT, { force: true });
  const cmd = runner === "e2e" ? `npx e2e run --grep "${TAG}-"` : `npx playwright test --grep @${TAG}-`;
  const env = { ...process.env, [runner === "e2e" ? "APP_URL" : "BASE_URL"]: PROXY };
  return new Promise((resolve) => {
    suite = spawn(cmd, { shell: true, stdio: "inherit", env });
    suite.on("exit", (code) => {
      suite = null;
      resolve(code);
    });
  });
}

function readPlaywright() {
  const report = readJson(REPORT);
  const tests = [];
  const walk = (s) => {
    for (const spec of s.specs ?? []) for (const t of spec.tests) tests.push({ title: spec.title, status: t.status });
    for (const child of s.suites ?? []) walk(child);
  };
  report.suites.forEach(walk);
  const ran = tests.filter((t) => t.status !== "skipped");
  const failed = ran.filter((t) => t.status !== "expected");
  return {
    tests_total: ran.length,
    passed: ran.length - failed.length,
    failed: failed.length,
    failed_tests: failed.map((t) => t.title.match(ID)?.[1] ?? t.title),
    duration_s: Math.round(report.stats.duration) / 1000,
    model: "",
    notes: "",
    tokens: { in: 0, cached: 0, out: 0 },
  };
}

function readE2e() {
  const run = readJson(REPORT).run;
  const results = run.results.filter((r) => r.selected);
  const failed = results.filter((r) => !["passed", "skipped"].includes(r.status));
  const cache = { replayed: 0, missed: 0, "handed off": 0 };
  const tokens = { in: 0, cached: 0, out: 0 };
  let model = "";
  let calls = 0;
  for (const r of results) {
    for (const a of r.attempts ?? []) {
      for (const s of a.steps ?? []) {
        if (s.cache?.mode) {
          const mode = s.cache.mode === "missed" ? "missed" : /hand/i.test(s.cache.mode) ? "handed off" : "replayed";
          cache[mode] += 1;
        }
        if (s.model) {
          model ||= `${s.model.provider}/${s.model.model}`;
          tokens.in += s.model.inputTokens ?? 0;
          tokens.cached += s.model.cacheReadTokens ?? 0;
          tokens.out += s.model.outputTokens ?? 0;
          calls += s.model.calls ?? 0;
        }
      }
    }
  }
  const cacheNote = Object.entries(cache).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ") || "sin pasos de agente";
  return {
    tests_total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    failed_tests: failed.map((r) => r.titlePath.at(-1).match(ID)?.[1] ?? r.titlePath.at(-1)),
    duration_s: Math.round(Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000,
    model,
    notes: `cache: ${cacheNote}; tokens in/cached/out ${tokens.in}/${tokens.cached}/${tokens.out}; ${calls} llamadas`,
    tokens,
  };
}

function costEur(tokens) {
  const pin = opt("--price-in");
  const pout = opt("--price-out");
  const rate = opt("--usd-eur");
  if (!tokens.in && !tokens.out) return 0;
  if (pin == null || pout == null || rate == null) return null;
  const pcached = Number(opt("--price-cached", pin));
  const usd = ((tokens.in - tokens.cached) * Number(pin) + tokens.cached * pcached + tokens.out * Number(pout)) / 1e6;
  return Math.round(usd * Number(rate) * 1e6) / 1e6;
}

async function measureOnce(label) {
  const code = await runSuite();
  if (!existsSync(REPORT)) throw new Error(`la suite terminó (código ${code}) sin escribir ${REPORT}`);
  const r = runner === "e2e" ? readE2e() : readPlaywright();
  if (!r.tests_total) throw new Error(`no se ejecutó ningún test con el tag ${TAG}-`);
  say(`${label}: ${r.passed}/${r.tests_total} verdes${r.failed ? ` · rojos: ${r.failed_tests.join(", ")}` : ""}`);
  return r;
}

function toRun(r, extraNotes) {
  const cost = costEur(r.tokens);
  const notes = [`proxy ${fault}`, r.notes, extraNotes, cost == null ? "cost_eur sin calcular: faltan --price-in/--price-out/--usd-eur" : ""]
    .filter(Boolean).join(". ");
  return {
    ...base(),
    model: r.model,
    tests_total: r.tests_total,
    passed: r.passed,
    failed: r.failed,
    failed_tests: r.failed_tests,
    duration_s: r.duration_s,
    cost_eur: cost ?? 0,
    notes,
  };
}

// ── Generación (M3/M4/M5): sin proxy ───────────────────────
function generation() {
  const interventions = opt("--interventions");
  if (interventions == null) die("generation necesita --interventions N (rechazos de review + loops de triage + intervenciones humanas)");
  const spec = readFileSync(`specs/${feature}.md`, "utf8");
  const scenarios = [...spec.matchAll(/^###\s+([A-Z][A-Z0-9]*-\d{2,3})\s+[—–-]/gm)].map((m) => m[1]);
  const ext = runner === "e2e" ? ".e2e.ts" : ".spec.ts";
  const files = [];
  const walk = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(ext)) files.push(p);
    }
  };
  walk("tests");
  const text = files.map((f) => readFileSync(f, "utf8")).join("\n");
  const traced = scenarios.filter((id) => new RegExp(`@${id}\\b`).test(text));
  writeRun({
    ...base(),
    human_interventions: Number(interventions),
    cost_eur: Number(opt("--cost-eur", 0)),
    scenarios_total: scenarios.length,
    scenarios_traced: traced.length,
    notes: `trazados ${traced.length}/${scenarios.length} en ${files.length} archivo(s) ${ext}`,
  });
}

// ── Mantenimiento (M6): diff de tests/ tras arreglar ──────
function maintenanceDiff() {
  const out = spawnSync("git", ["diff", "--numstat", "--", "tests/"], { encoding: "utf8" }).stdout.trim();
  const rows = out ? out.split(/\r?\n/).map((l) => l.split("\t")) : [];
  return { files: rows.length, lines: rows.reduce((n, [a, d]) => n + Number(a) + Number(d), 0) };
}

// ── Principal ─────────────────────────────────────────────
try {
  if (kind === "generation") {
    generation();
    process.exit(0);
  }
  await startProxy(fault);
  say(`${runner} · ${feature} · ${kind}${fault !== "none" ? ` · ${fault}` : ""} · por ${PROXY}`);

  if (kind === "control") {
    const r = await measureOnce("control");
    if (r.failed) throw new Error("el control por el proxy no está en verde: no midas hasta arreglarlo (proxy o entorno, nunca los tests)");
    say("control OK (no se registra)");
  } else if (kind === "maintenance") {
    const r = await measureOnce("F-M");
    if (!flag("--record")) {
      say(r.failed
        ? "arregla los tests (sin tocar la spec) hasta que pasen con F-M y repite con --record"
        : "pasa sin tocar nada: repite con --record para registrar 0 archivos / 0 líneas");
    } else {
      if (r.failed) throw new Error("con --record la suite debe pasar con F-M");
      const diff = maintenanceDiff();
      writeRun({ ...toRun(r, `arreglo: git diff --numstat -- tests/`), files_changed: diff.files, lines_changed: diff.lines });
      say("revierte el arreglo con `git checkout -- tests/`: el cambio de UI es simulado");
    }
  } else {
    for (let i = 1; i <= repeat; i += 1) writeRun(toRun(await measureOnce(`${kind} ${i}/${repeat}`)));
  }
} catch (e) {
  cleanup();
  die(e.message);
}
cleanup();
