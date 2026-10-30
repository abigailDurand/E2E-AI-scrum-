#!/usr/bin/env node
// compare.mjs — Agrega comparison/runs/ y aplica PROTOCOLO.md §4–§5.
//
// Uso:
//   node scripts/compare.mjs              escribe comparison/RESULTADOS.md
//   node scripts/compare.mjs --stdout     imprime el informe sin escribirlo
//   node scripts/compare.mjs --runs <dir> --out <file>   otras rutas (pruebas)
//
// No inventa datos: lo que falte sale como "incompleto" y el veredicto queda
// PROVISIONAL, sin ganador.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const RUNS_DIR = opt("--runs", "comparison/runs");
const OUT = opt("--out", "comparison/RESULTADOS.md");
const STDOUT = argv.includes("--stdout");

// Constantes de PROTOCOLO.md: cambiarlas aquí exige versionarlas allí (§9).
const RUNNERS = ["playwright", "e2e"];
const KINDS = ["generation", "stability", "injection", "maintenance"];
const STABILITY_RUNS = 10;
const INJECTION_RUNS = 3;
const CI_DAYS = 30;
const GATES = { m1Min: 90, m2Max: 2, m5: 100 };
const WEIGHTS = { m1: 35, m2: 25, m3: 15, m4: 15, m6: 10 };
const TIE_MARGIN = 5;

// Quita el BOM: PowerShell 5.1 y algunos editores de Windows lo añaden y rompe JSON.parse.
const readJson = (path) => JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
const fmt = (v, digits = 1) => (v == null ? "—" : Number(v).toFixed(digits));

const problems = [];
const features = readJson("comparison/features.json").features;

function loadRuns(runner) {
  const runs = [];
  for (const f of features) {
    const dir = join(RUNS_DIR, runner, f.name);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((n) => /^run-\d+\.json$/.test(n)).sort()) {
      const path = join(dir, file);
      let run;
      try {
        run = readJson(path);
      } catch (e) {
        problems.push(`${path}: JSON inválido (${e.message})`);
        continue;
      }
      if (run.runner !== runner) problems.push(`${path}: runner "${run.runner}" ≠ carpeta "${runner}"`);
      if (run.feature !== f.name) problems.push(`${path}: feature "${run.feature}" ≠ carpeta "${f.name}"`);
      if (!KINDS.includes(run.kind)) {
        problems.push(`${path}: kind "${run.kind}" no es ${KINDS.join(" | ")}`);
        continue;
      }
      if (f.spec_commit && run.spec_commit && !f.spec_commit.startsWith(run.spec_commit)
        && !run.spec_commit.startsWith(f.spec_commit)) {
        problems.push(`${path}: spec_commit ${run.spec_commit} ≠ congelado ${f.spec_commit}`);
      }
      runs.push({ ...run, _path: path });
    }
  }
  return runs;
}

function metrics(runner) {
  const runs = loadRuns(runner);
  const of = (feature, kind) => runs.filter((r) => r.feature === feature && r.kind === kind);
  const missing = [];
  const m = { runs: runs.length, missing };

  // M1 — fallos inyectados detectados (detectado = falla en las 3 ejecuciones).
  const faults = features.flatMap((f) => f.faults.map((id) => ({ id, feature: f.name })));
  let detected = 0;
  m.faults = faults.map(({ id, feature }) => {
    const rs = of(feature, "injection").filter((r) => r.fault_id === id);
    const hits = rs.filter((r) => r.failed > 0).length;
    const complete = rs.length >= INJECTION_RUNS;
    if (!complete) missing.push(`${id} (${feature}): ${rs.length}/${INJECTION_RUNS} inyecciones`);
    const ok = complete && hits === rs.length;
    if (ok) detected += 1;
    return { id, feature, runs: rs.length, hits, detected: ok };
  });
  m.m1 = faults.length ? (detected / faults.length) * 100 : null;

  // M2 — % flaky: test que falla en unas ejecuciones y en otras no.
  let flakyTests = 0;
  let totalTests = 0;
  m.stability = features.map((f) => {
    const rs = of(f.name, "stability");
    if (rs.length < STABILITY_RUNS) missing.push(`${f.name}: ${rs.length}/${STABILITY_RUNS} ejecuciones de estabilidad`);
    const total = Math.max(0, ...rs.map((r) => r.tests_total ?? 0));
    const failedSets = rs.map((r) => new Set(r.failed_tests ?? []));
    const everFailed = new Set(failedSets.flatMap((s) => [...s]));
    const flaky = [...everFailed].filter((id) => failedSets.some((s) => !s.has(id)));
    const alwaysRed = [...everFailed].filter((id) => failedSets.every((s) => s.has(id)));
    for (const r of rs) {
      if ((r.failed ?? 0) > 0 && !(r.failed_tests ?? []).length) {
        problems.push(`${r._path}: failed=${r.failed} pero failed_tests está vacío`);
      }
    }
    flakyTests += flaky.length;
    totalTests += total;
    return {
      feature: f.name,
      runs: rs.length,
      total,
      flaky,
      alwaysRed,
      cost: mean(rs.map((r) => r.cost_eur ?? 0)),
      duration: mean(rs.map((r) => r.duration_s ?? 0)),
    };
  });
  m.m2 = totalTests ? (flakyTests / totalTests) * 100 : null;

  // M3 — coste a 30 días: generación + coste medio por ejecución × 30.
  const generation = features.map((f) => {
    const rs = of(f.name, "generation");
    if (!rs.length) missing.push(`${f.name}: sin ejecución de generación`);
    return { feature: f.name, runs: rs };
  });
  const genCost = sum(generation.flatMap((g) => g.runs.map((r) => r.cost_eur ?? 0)));
  const perRun = sum(m.stability.map((s) => s.cost ?? 0));
  m.m3 = genCost + perRun * CI_DAYS;
  m.genCost = genCost;
  m.perRunCost = perRun;
  m.duration = sum(m.stability.map((s) => s.duration ?? 0));

  // M4 — intervenciones (rechazos de review + loops de triage + humanas).
  m.m4 = sum(generation.flatMap((g) => g.runs.map((r) => r.human_interventions ?? 0)));

  // M5 — trazabilidad, con la última generación de cada feature.
  const last = generation.map((g) => g.runs.at(-1)).filter(Boolean);
  const scen = sum(last.map((r) => r.scenarios_total ?? 0));
  m.m5 = scen ? (sum(last.map((r) => r.scenarios_traced ?? 0)) / scen) * 100 : null;

  // M6 — líneas a tocar para absorber el cambio de UI (F-M).
  const maint = runs.filter((r) => r.kind === "maintenance");
  if (!maint.length) missing.push("F-M: sin ejecución de mantenimiento");
  m.m6 = maint.length ? sum(maint.map((r) => r.lines_changed ?? 0)) : null;
  m.m6Files = maint.length ? sum(maint.map((r) => r.files_changed ?? 0)) : null;

  m.gates = {
    g1: m.m1 != null && m.m1 >= GATES.m1Min,
    g2: m.m2 != null && m.m2 <= GATES.m2Max,
    g3: m.m5 != null && m.m5 === GATES.m5,
  };
  m.passesGates = Object.values(m.gates).every(Boolean);
  return m;
}

// 100 = mejor de los dos; el otro, proporcional.
function normalize(a, b, higherIsBetter) {
  if (a == null || b == null) return [null, null];
  if (higherIsBetter) {
    const best = Math.max(a, b);
    return best === 0 ? [100, 100] : [(a / best) * 100, (b / best) * 100];
  }
  const best = Math.min(a, b);
  const score = (v) => (v === best ? 100 : (best / v) * 100);
  return [score(a), score(b)];
}

const [pw, e2] = RUNNERS.map(metrics);
const complete = !pw.missing.length && !e2.missing.length && !problems.length;
// Sin datos completos no se puntúa: 0 contra 0 saldría como empate perfecto (100).
const scores = { playwright: {}, e2e: {} };
for (const [key, higher] of [["m1", true], ["m2", false], ["m3", false], ["m4", false], ["m6", false]]) {
  const [a, b] = complete ? normalize(pw[key], e2[key], higher) : [null, null];
  scores.playwright[key] = a;
  scores.e2e[key] = b;
}
const total = (s) => (Object.values(s).some((v) => v == null)
  ? null
  : sum(Object.entries(WEIGHTS).map(([k, w]) => (s[k] * w) / 100)));
const totals = { playwright: total(scores.playwright), e2e: total(scores.e2e) };

let verdict;
if (!complete) {
  verdict = "**PROVISIONAL** — faltan ejecuciones o hay datos inválidos; no se declara ganador.";
} else if (pw.passesGates !== e2.passesGates) {
  verdict = `Gana **${pw.passesGates ? "playwright" : "e2e"}**: es el único que pasa los gates (§5 regla 1).`;
} else if (!pw.passesGates) {
  verdict = "Ninguno pasa los gates: se queda **playwright** (coste de cambio).";
} else {
  const diff = totals.e2e - totals.playwright;
  verdict = Math.abs(diff) < TIE_MARGIN
    ? `Empate técnico (diferencia ${fmt(Math.abs(diff))} < ${TIE_MARGIN}): se queda **playwright** (§5 regla 3).`
    : `Gana **${diff > 0 ? "e2e" : "playwright"}** por ${fmt(Math.abs(diff))} puntos (§5 regla 2).`;
}

const yes = (b) => (b ? "✅" : "❌");
const lines = [
  "# Resultados: Playwright vs `e2e`",
  "",
  `> Generado por \`node scripts/compare.mjs\` el ${new Date().toISOString().slice(0, 10)}`,
  `> a partir de \`${RUNS_DIR}\`. No editar a mano: corregir los runs y regenerar.`,
  "",
  "## Veredicto",
  "",
  verdict,
  "",
  "## Gates (§4)",
  "",
  "| Gate | Umbral | playwright | e2e |",
  "|---|---|---|---|",
  `| G1 eficacia (M1) | ≥ ${GATES.m1Min} % | ${fmt(pw.m1)} % ${yes(pw.gates.g1)} | ${fmt(e2.m1)} % ${yes(e2.gates.g1)} |`,
  `| G2 estabilidad (M2) | ≤ ${GATES.m2Max} % flaky | ${fmt(pw.m2)} % ${yes(pw.gates.g2)} | ${fmt(e2.m2)} % ${yes(e2.gates.g2)} |`,
  `| G3 trazabilidad (M5) | = ${GATES.m5} % | ${fmt(pw.m5)} % ${yes(pw.gates.g3)} | ${fmt(e2.m5)} % ${yes(e2.gates.g3)} |`,
  "",
  "## Puntuación ponderada (§5)",
  "",
  ...(complete ? [] : ["_Los puntos solo se calculan con todas las ejecuciones; abajo, los valores parciales._", ""]),
  "| Métrica | Peso | playwright (valor → puntos) | e2e (valor → puntos) |",
  "|---|---|---|---|",
  `| M1 eficacia (% detectados) | ${WEIGHTS.m1} % | ${fmt(pw.m1)} → ${fmt(scores.playwright.m1)} | ${fmt(e2.m1)} → ${fmt(scores.e2e.m1)} |`,
  `| M2 estabilidad (% flaky) | ${WEIGHTS.m2} % | ${fmt(pw.m2)} → ${fmt(scores.playwright.m2)} | ${fmt(e2.m2)} → ${fmt(scores.e2e.m2)} |`,
  `| M3 coste 30 días (€) | ${WEIGHTS.m3} % | ${fmt(pw.m3, 2)} → ${fmt(scores.playwright.m3)} | ${fmt(e2.m3, 2)} → ${fmt(scores.e2e.m3)} |`,
  `| M4 intervenciones | ${WEIGHTS.m4} % | ${fmt(pw.m4, 0)} → ${fmt(scores.playwright.m4)} | ${fmt(e2.m4, 0)} → ${fmt(scores.e2e.m4)} |`,
  `| M6 líneas a tocar (F-M) | ${WEIGHTS.m6} % | ${fmt(pw.m6, 0)} → ${fmt(scores.playwright.m6)} | ${fmt(e2.m6, 0)} → ${fmt(scores.e2e.m6)} |`,
  `| **Total** | 100 % | **${fmt(totals.playwright)}** | **${fmt(totals.e2e)}** |`,
  "",
  "## Detalle",
  "",
  "### M1 — Fallos inyectados",
  "",
  "| Fallo | Feature | playwright (falla/ejecuciones) | e2e (falla/ejecuciones) |",
  "|---|---|---|---|",
  ...pw.faults.map((f, i) => {
    const g = e2.faults[i];
    return `| ${f.id} | ${f.feature} | ${f.hits}/${f.runs} ${yes(f.detected)} | ${g.hits}/${g.runs} ${yes(g.detected)} |`;
  }),
  "",
  "### M2 / M3 — Estabilidad, duración y coste por ejecución",
  "",
  "| Feature | Runner | Ejecuciones | Tests | Flaky | Siempre en rojo | Duración media (s) | Coste medio (€) |",
  "|---|---|---|---|---|---|---|---|",
  ...[pw, e2].flatMap((m, i) => m.stability.map((s) =>
    `| ${s.feature} | ${RUNNERS[i]} | ${s.runs} | ${s.total} | ${s.flaky.join(", ") || "—"} | ${s.alwaysRed.join(", ") || "—"} | ${fmt(s.duration)} | ${fmt(s.cost, 4)} |`)),
  "",
  `Coste de generación: playwright ${fmt(pw.genCost, 2)} € · e2e ${fmt(e2.genCost, 2)} €.`,
  `Coste por ejecución de la suite: playwright ${fmt(pw.perRunCost, 4)} € · e2e ${fmt(e2.perRunCost, 4)} €.`,
  "",
  "### M6 — Mantenimiento",
  "",
  `playwright: ${fmt(pw.m6Files, 0)} archivos / ${fmt(pw.m6, 0)} líneas · e2e: ${fmt(e2.m6Files, 0)} archivos / ${fmt(e2.m6, 0)} líneas.`,
  "",
  "## Ejecuciones pendientes",
  "",
  ...(pw.missing.length || e2.missing.length
    ? [...pw.missing.map((x) => `- playwright: ${x}`), ...e2.missing.map((x) => `- e2e: ${x}`)]
    : ["Ninguna."]),
  "",
  "## Datos inválidos",
  "",
  ...(problems.length ? problems.map((p) => `- ${p}`) : ["Ninguno."]),
  "",
];
const report = lines.join("\n");

if (STDOUT) console.log(report);
else {
  writeFileSync(OUT, report, "utf8");
  console.log(`${OUT} escrito (${pw.runs} runs playwright, ${e2.runs} runs e2e)`);
  console.log(verdict.replace(/\*\*/g, ""));
}
