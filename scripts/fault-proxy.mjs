#!/usr/bin/env node
// fault-proxy.mjs — Proxy local que inyecta los fallos del catálogo (PROTOCOLO.md §6).
//
// Uso:
//   FAULT=F-1 node scripts/fault-proxy.mjs     inyecta F-1 en http://127.0.0.1:8787
//   node scripts/fault-proxy.mjs               sin FAULT (o FAULT=none): solo reenvía (control)
//
// Los tests se apuntan al proxy con BASE_URL (Playwright) o APP_URL (e2e).
// El mecanismo de cada fallo está fijado en comparison/runs/<runner>/INYECCION.md:
// si cambias este archivo, ambos deben seguir diciendo lo mismo.

import { createServer } from "node:http";

const UPSTREAM = "https://sauce-demo.myshopify.com";
const PORT = Number(process.env.PORT ?? 8787);
const SELF = `http://127.0.0.1:${PORT}`;
const FAULT = (process.env.FAULT ?? "none").toUpperCase();
const FAULTS = ["NONE", "F-1", "F-2", "F-3", "F-4", "F-5", "F-6", "F-7", "F-M"];
// Variantes agotadas observadas el 2026-10-30 (INYECCION.md, F-7).
const SOLD_OUT = { "brown-shades": 1063105029, "white-sandals": 611940609 };

if (!FAULTS.includes(FAULT)) {
  console.error(`FAULT desconocido: ${FAULT} (válidos: ${FAULTS.join(", ")})`);
  process.exit(2);
}

// Cabeceras que no se reenvían: las recalcula fetch o el servidor, o romperían
// la página servida por http:// (CSP con upgrade-insecure-requests, HSTS).
const DROP_REQUEST = new Set(["host", "connection", "content-length", "accept-encoding"]);
const DROP_RESPONSE = new Set([
  "content-security-policy",
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "strict-transport-security",
  "set-cookie",
]);
const TEXTUAL = /html|json|javascript|xml|text/;

const toUpstream = (v) => v.replaceAll(SELF, UPSTREAM);
const toSelf = (v) => v.replaceAll(UPSTREAM, SELF).replaceAll("//sauce-demo.myshopify.com", `//127.0.0.1:${PORT}`);
// Las cookies vuelven sin Secure ni Domain: el proxy es http:// en 127.0.0.1.
const cookieForSelf = (c) => c.replace(/;\s*secure/gi, "").replace(/;\s*domain=[^;]*/gi, "");

const log = (msg) => console.error(`[fault-proxy ${FAULT}] ${msg}`);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function cartAddParams(req, body) {
  const text = body.toString("utf8");
  if ((req.headers["content-type"] ?? "").includes("json")) {
    const json = JSON.parse(text || "{}");
    const item = json.items?.[0] ?? json;
    return { id: Number(item.id), quantity: Number(item.quantity ?? 1) };
  }
  const form = new URLSearchParams(text);
  return { id: Number(form.get("id")), quantity: Number(form.get("quantity") ?? 1) };
}

async function forward(req, body, path = req.url, method = req.method) {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!DROP_REQUEST.has(k)) headers[k] = toUpstream(Array.isArray(v) ? v.join(", ") : v);
  }
  return fetch(UPSTREAM + path, {
    method,
    headers,
    body: ["GET", "HEAD"].includes(method) ? undefined : body,
    redirect: "manual",
  });
}

// Fallos que responden sin reenviar. Devuelven true si ya respondieron.
async function shortCircuit(req, res, body, path) {
  const { method } = req;
  if (FAULT === "F-1" && method === "GET" && path === "/blogs/news") {
    log(`404 en ${path}`);
    send(res, 404, "<!doctype html><title>404 Not Found</title><h1>404 Page Not Found</h1>",
      { "content-type": "text/html; charset=utf-8" });
    return true;
  }
  if (FAULT === "F-4" && method === "GET" && /^\/products\/[^/]+\.js$/.test(path)) {
    log(`500 en ${path}`);
    send(res, 500, JSON.stringify({ error: "injected" }), { "content-type": "application/json" });
    return true;
  }
  if (FAULT === "F-5" && method === "POST" && /^\/cart\/add(\.js)?$/.test(path)) {
    log(`add sin reenviar en ${path}`);
    if (path.endsWith(".js")) {
      const { id, quantity } = cartAddParams(req, body);
      send(res, 200, JSON.stringify({ id, variant_id: id, quantity, key: `${id}:injected` }),
        { "content-type": "application/json" });
    } else send(res, 302, "", { location: "/cart" });
    return true;
  }
  if (FAULT === "F-6" && method === "POST" && /^\/cart\/(change|update)(\.js)?$/.test(path)) {
    log(`cambio de cantidad sin reenviar en ${path}`);
    if (path.endsWith(".js")) {
      const cart = await forward(req, body, "/cart.js", "GET");
      send(res, 200, await cart.text(), { "content-type": "application/json" });
    } else send(res, 302, "", { location: "/cart" });
    return true;
  }
  return false;
}

// Fallos que modifican la respuesta real de la tienda.
function mutate(path, contentType, text) {
  if (FAULT === "F-2" && path === "/pages/about-us" && contentType.includes("html")) {
    log(`quitado <h1>About Us</h1> en ${path}`);
    return text.replace("<h1>About Us</h1>", "");
  }
  if (FAULT === "F-3" && path === "/products.json") {
    const json = JSON.parse(text);
    delete json.products[0].variants[0].price;
    log(`borrado price de ${json.products[0].handle}/${json.products[0].variants[0].id}`);
    return JSON.stringify(json);
  }
  if (FAULT === "F-7") {
    const ids = new Set(Object.values(SOLD_OUT));
    const markAvailable = (p) => {
      let hit = false;
      for (const v of p.variants ?? []) if (ids.has(v.id)) { v.available = true; hit = true; }
      if (hit && "available" in p) p.available = true;
      return hit;
    };
    if (path === "/products.json") {
      const json = JSON.parse(text);
      const hits = json.products.filter(markAvailable).map((p) => p.handle);
      if (hits.length) log(`disponibles en ${path}: ${hits.join(", ")}`);
      return JSON.stringify(json);
    }
    const m = path.match(/^\/products\/([^/.]+)(\.js|\.json)?$/);
    if (m && SOLD_OUT[m[1]]) {
      log(`disponible en ${path}`);
      if (!m[2]) return text.replaceAll('"available":false', '"available":true');
      const json = JSON.parse(text);
      markAvailable(json.product ?? json);
      return JSON.stringify(json);
    }
  }
  if (FAULT === "F-M" && /^\/products\/[^/.]+$/.test(path) && contentType.includes("html")) {
    log(`botón renombrado en ${path}`);
    return text
      .replace('value="Add To Cart"', 'value="Add to Bag"')
      .replaceAll(".val('Add to Cart')", ".val('Add to Bag')");
  }
  return text;
}

const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, SELF).pathname;
    const body = await readBody(req);
    if (await shortCircuit(req, res, body, path)) return;

    const upstream = await forward(req, body);
    const headers = {};
    for (const [k, v] of upstream.headers) {
      if (!DROP_RESPONSE.has(k)) headers[k] = k === "location" ? toSelf(v) : v;
    }
    const cookies = upstream.headers.getSetCookie().map(cookieForSelf);
    if (cookies.length) headers["set-cookie"] = cookies;

    const contentType = upstream.headers.get("content-type") ?? "";
    let payload = Buffer.from(await upstream.arrayBuffer());
    if (TEXTUAL.test(contentType)) payload = Buffer.from(mutate(path, contentType, toSelf(payload.toString("utf8"))));
    send(res, upstream.status, payload, headers);
  } catch (e) {
    log(`error en ${req.method} ${req.url}: ${e.message}`);
    if (!res.headersSent) send(res, 502, `fault-proxy: ${e.message}`);
  }
});

server.listen(PORT, "127.0.0.1", () => log(`escuchando en ${SELF} → ${UPSTREAM}`));
