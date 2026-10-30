# Inyección de fallos — e2e@0.21.3

> Mecanismo concreto para cada fallo del catálogo (PROTOCOLO.md §6).
> Se rellena **antes** de ejecutar las inyecciones y no se cambia después.
> Debe provocar el mismo fallo observable que en `runs/playwright/INYECCION.md`.
> Caché de repeticiones activada (PROTOCOLO §2).
> Fijado el 2026-10-30, antes de cualquier medición.

## Mecanismo común: proxy local de fallos

El sitio es de terceros, así que el fallo no se provoca en la tienda: se
provoca en un **proxy local** que se pone entre los tests y
`https://sauce-demo.myshopify.com`. Es el **mismo proxy y el mismo fallo para
los dos runners**: así cualquier diferencia en M1/M6 es del runner, no del
mecanismo. Además cubre los tests de API, que hacen las peticiones desde Node y
no pasarían por una intercepción del navegador (`page.route` / `browser.route`).

- **Script:** `scripts/fault-proxy.mjs` (pendiente de implementar; se escribe
  y se prueba antes de la primera inyección).
- **Arranque:** `FAULT=<ID> node scripts/fault-proxy.mjs` → escucha en
  `http://127.0.0.1:8787`. Sin `FAULT` (o `FAULT=none`) solo reenvía.
- **Siempre, con o sin fallo:** reenvía a la tienda con su `Host`, quita la
  cabecera `content-security-policy` (su `upgrade-insecure-requests` rompería
  la página servida por `http://`), y reescribe `https://sauce-demo.myshopify.com`
  → `http://127.0.0.1:8787` en cabeceras `Location` y en cuerpos HTML/JSON.
- **Control obligatorio:** antes de inyectar, una ejecución completa de la
  feature a través del proxy con `FAULT=none` debe salir **verde**. Si no, el
  fallo es del proxy: se arregla el proxy, nunca los tests. El control no se
  registra como `injection`; se anota en `notes` de la primera inyección.

## Cómo se ejecuta una inyección

1. Terminal 1: `FAULT=<ID> node scripts/fault-proxy.mjs`.
2. Terminal 2: la suite de la feature apuntando al proxy (ver la columna
   "Cómo se activa" de abajo), 3 veces (§3, M1).
3. Un `run-NN.json` por ejecución, `kind: "injection"`, `fault_id: "<ID>"`.
   Detectado = la ejecución tiene al menos un test en rojo (`failed > 0`).

## Catálogo

| ID | Feature | Mecanismo (en el proxy) | Cómo se activa |
|---|---|---|---|
| F-1 | smoke_navigation | `GET /blogs/news` (destino del enlace "Blog") → **404** con HTML mínimo `<title>404 Not Found</title><h1>404 Page Not Found</h1>`, sin reenviar a la tienda. Debe caer NAV-03. | `APP_URL=http://127.0.0.1:8787 npx e2e run --grep "NAV-"` |
| F-2 | smoke_navigation | `GET /pages/about-us` → se reenvía y se **elimina del HTML** el elemento exacto `<h1>About Us</h1>` (el resto igual: URL, `<title>` y menú intactos). Debe caer NAV-04. | `APP_URL=http://127.0.0.1:8787 npx e2e run --grep "NAV-"` |
| F-3 | products_api | `GET /products.json` → se reenvía y se **borra la clave `price`** de la primera variante del primer producto. Status 200 y resto del JSON intactos. | `APP_URL=http://127.0.0.1:8787 npx e2e run --grep "PAPI-"` |
| F-4 | products_api | `GET /products/<handle>.js` (cualquier handle) → **500** con cuerpo `{"error":"injected"}`, sin reenviar. | `APP_URL=http://127.0.0.1:8787 npx e2e run --grep "PAPI-"` |
| F-5 | cart | `POST /cart/add.js` → **200** con JSON de línea plausible (`id` y `quantity` de la petición) **sin reenviar**; `POST /cart/add` (formulario) → **302** a `/cart` sin reenviar. El carrito real (`/cart.js`) sigue vacío. | `APP_URL=http://127.0.0.1:8787 npx e2e run --grep "CART-"` |
| F-6 | cart | `POST /cart/change(.js)` y `POST /cart/update(.js)` → **no se reenvían**: las `.js` responden 200 con el `/cart.js` actual de la tienda (mismas cookies); las de formulario, 302 a `/cart`. La cantidad pedida no se aplica y el total no cambia. | `APP_URL=http://127.0.0.1:8787 npx e2e run --grep "CART-"` |
| F-7 | cart | Variantes agotadas (`brown-shades` 1063105029 y `white-sandals` 611940609, observadas el 2026-10-30): `"available":false` → `true` en `/products.json`, `/products/<handle>.js` y en el JSON del producto incrustado en la ficha HTML (su script habilita el botón "Add to Cart" en lugar de "Sold Out"). `/cart/add.js` se reenvía tal cual (la tienda real lo rechaza). | `APP_URL=http://127.0.0.1:8787 npx e2e run --grep "CART-"` |
| F-M | cart (ficha de producto) | En el HTML de `/products/*`: el botón `<input id="add" value="Add To Cart">` pasa a `value="Add to Bag"` y el texto que pone su script (`val('Add to Cart')`) también. Mide M6, no M1. | `APP_URL=http://127.0.0.1:8787 npx e2e run --grep "CART-"` |

## F-M: cómo se mide M6

1. Con `FAULT=F-M`, ejecutar la suite de `cart` contra el proxy.
2. Si falla, arreglar los tests (sin tocar la spec) hasta que pase en verde
   contra el proxy.
3. `git diff --stat -- tests/` da `files_changed` y `lines_changed`
   (insertadas + borradas) → `run-NN.json` con `kind: "maintenance"`.
   Si pasa sin tocar nada: `0` y `0`.
4. Revertir el arreglo (`git checkout -- tests/`): el cambio de UI es simulado.
