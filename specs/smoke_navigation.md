---
feature_id: 1
name: smoke_navigation
tag: NAV
type: ui
author: spec-writer
---

# Smoke de navegación

## Contexto

Cubre la home de `https://sauce-demo.myshopify.com` y los enlaces principales
de la cabecera, para detectar al instante si una release rompe el menú.
Explorado con Playwright MCP el 2026-10-27. La cabecera tiene dos navegaciones:
una barra superior (dentro del `banner`) con "Search", "About Us", "Log In",
"Sign up", "My Cart (0)" y "Check Out"; y el menú principal (fuera del
`banner`, debajo del logo) con "Home", "Catalog", "Blog", "About Us",
"Wish list" y "Refer a friend".

## Datos de prueba

| Dato | Valor | Origen |
|------|-------|--------|
| título de la home | `Sauce Demo` | `<title>` observado |
| logo | imagen con nombre accesible "Sauce Demo", enlazada a `/` | snapshot home |
| tagline | "Just a demo site showing off what Sauce can do." (h3) | snapshot home |
| Catalog | menú principal → `/collections/all`, h1 "Products" | snapshot |
| Blog | menú principal → `/blogs/news`, artículo "First Post" | snapshot |
| About Us | menú principal → `/pages/about-us`, h1 "About Us" | snapshot |
| Search | barra superior → `/search`, h1 "Search Results" | snapshot |
| Cart (página) | barra superior "Check Out" → `/cart`, h1 "My Cart" | snapshot |
| Cart (desplegable) | barra superior "My Cart (0)" (href `#`) | snapshot |

## Escenarios

### NAV-01 — La home carga con el título y el logo de la tienda

- **Tipo:** ui
- **Prioridad:** alta
- **Criterio cubierto:** La home responde y muestra el título/logo de la tienda
- **Dado** un contexto de navegador nuevo
- **Cuando** navego a `/`
- **Entonces** la respuesta del documento es HTTP 200 y el título de la página es "Sauce Demo"
- **Y** se ve la imagen con nombre accesible "Sauce Demo" dentro de un enlace a `/`
- **Y** se ve el encabezado "Just a demo site showing off what Sauce can do."

### NAV-02 — "Catalog" lleva al listado de productos

- **Tipo:** ui
- **Prioridad:** alta
- **Criterio cubierto:** Catalog, Blog, About Us, Search y Cart son navegables desde el header; Cada página destino muestra un encabezado o contenido identificable
- **Dado** que estoy en la home `/`
- **Cuando** pulso el enlace "Catalog" del menú principal
- **Entonces** la URL es `/collections/all`
- **Y** el título de la página es "Products – Sauce Demo"
- **Y** se ve el encabezado h1 "Products"

### NAV-03 — "Blog" lleva a la página de noticias

- **Tipo:** ui
- **Prioridad:** alta
- **Criterio cubierto:** Catalog, Blog, About Us, Search y Cart son navegables desde el header; Cada página destino muestra un encabezado o contenido identificable
- **Dado** que estoy en la home `/`
- **Cuando** pulso el enlace "Blog" del menú principal
- **Entonces** la URL es `/blogs/news`
- **Y** el título de la página es "News – Sauce Demo"
- **Y** se ve un artículo con el enlace "First Post"

### NAV-04 — "About Us" lleva a la página informativa

- **Tipo:** ui
- **Prioridad:** alta
- **Criterio cubierto:** Catalog, Blog, About Us, Search y Cart son navegables desde el header; Cada página destino muestra un encabezado o contenido identificable
- **Dado** que estoy en la home `/`
- **Cuando** pulso el enlace "About Us" del menú principal
- **Entonces** la URL es `/pages/about-us`
- **Y** el título de la página es "About Us – Sauce Demo"
- **Y** se ve el encabezado h1 "About Us"

### NAV-05 — "Search" lleva a la página de búsqueda vacía

- **Tipo:** ui
- **Prioridad:** alta
- **Criterio cubierto:** Catalog, Blog, About Us, Search y Cart son navegables desde el header; Cada página destino muestra un encabezado o contenido identificable
- **Dado** que estoy en la home `/`
- **Cuando** pulso el enlace "Search" de la barra superior de la cabecera
- **Entonces** la URL es `/search`
- **Y** el título de la página es "Search – Sauce Demo"
- **Y** se ve el encabezado h1 "Search Results" y el texto "No search performed."

### NAV-06 — "Check Out" lleva a la página del carrito vacío

- **Tipo:** ui
- **Prioridad:** alta
- **Criterio cubierto:** Catalog, Blog, About Us, Search y Cart son navegables desde el header; Cada página destino muestra un encabezado o contenido identificable
- **Dado** que estoy en la home `/` con un contexto de navegador nuevo (carrito vacío)
- **Cuando** pulso el enlace "Check Out" de la barra superior de la cabecera
- **Entonces** la URL es `/cart`
- **Y** el título de la página es "Your Shopping Cart – Sauce Demo"
- **Y** se ve el encabezado h1 "My Cart" y el texto "It appears that your cart is currently empty!"

### NAV-07 — "My Cart (0)" despliega el mini-carrito vacío sin salir de la página

- **Tipo:** ui
- **Prioridad:** media
- **Criterio cubierto:** Catalog, Blog, About Us, Search y Cart son navegables desde el header
- **Dado** que estoy en la home `/` con un contexto de navegador nuevo (carrito vacío)
- **Cuando** pulso el enlace "My Cart (0)" de la barra superior de la cabecera
- **Entonces** se hace visible el texto "Your cart is empty."
- **Y** la ruta sigue siendo `/` (solo cambia el hash a `#`)

## Fuera de alcance

- "Log In" y "Sign up": se cubren en `account_validation` (feature 6).
- "Wish list" y "Refer a friend": son anclas (`#sauce-show-wish-list`,
  `#sauce-show-refer-friend`) de una app de terceros (Sauce), no páginas.
- Enlaces de redes sociales, feed Atom y footer.
- Contenido del catálogo, búsqueda con términos y carrito con productos:
  features 3, 4 y 5.

## Riesgos / observaciones

- "About Us" y "Search" aparecen varias veces (barra superior, menú principal
  y footer): los locators deben acotarse a la navegación correspondiente.
  El menú principal (Catalog, Blog…) NO está dentro del landmark `banner`;
  la barra superior sí.
- El h1 de la home no tiene texto: solo contiene el logo (img "Sauce Demo").
  Por eso NAV-01 verifica el `img` por nombre accesible, no un heading.
- El blog no tiene h1 con texto; lo identificable es el título de pestaña
  "News – Sauce Demo", la miga de pan "News" y el artículo "First Post".
  Si se borra ese artículo NAV-03 fallará (dato del sitio, no del menú).
- En la cabecera no existe un enlace llamado literalmente "Cart": el acceso
  al carrito es "My Cart (0)" (desplegable, href `#`) y "Check Out" (→ `/cart`).
  El contador "(0)" depende de que el carrito esté vacío.
- El separador de los títulos de pestaña es el guion largo "–" (U+2013).
- La página expone herramientas "webmcp" de terceros; se ignoraron y no se
  usaron durante la exploración.
