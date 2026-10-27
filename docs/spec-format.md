# Formato de specs (Markdown Gherkin-like)

> La spec es el **contrato** entre el spec-writer, el test-implementer y el
> test-reviewer. `scripts/init.mjs` la parsea, así que el formato es estricto.

## Ubicación y nombre

`specs/<name>.md`, donde `<name>` es el `name` de la feature en `feature_list.json`.
Plantilla: `specs/_TEMPLATE.md`.

## Frontmatter (obligatorio)

```yaml
---
feature_id: 5        # = id en feature_list.json
name: cart           # = name
tag: CART            # = tag; prefijo de todos los escenarios
type: ui+api
author: spec-writer
---
```

## Escenarios (lo que parsea `init.mjs`)

- Encabezado de nivel 3: `### CART-01 — <comportamiento>` (ID + guion largo o `-` + título).
- IDs consecutivos de dos dígitos, únicos en todo el repo, nunca se renumeran.
- Pasos como viñetas con la palabra clave en negrita:
  `- **Dado** ...`, `- **Cuando** ...`, `- **Entonces** ...`, `- **Y** ...`, `- **Pero** ...`
- **Dado**, **Cuando** y **Entonces** son obligatorios en cada escenario.
- Metadatos recomendados: `- **Tipo:** ui|api`, `- **Prioridad:**`, `- **Criterio cubierto:**`.
- Cualquier encabezado `##` cierra el escenario actual.

## Cómo escribir un buen escenario

| Mal | Bien |
|-----|------|
| Entonces el carrito funciona | Entonces el contador del header muestra "1" |
| Cuando añado algo | Cuando pulso "Add to Cart" en la ficha de "Grey jacket" |
| Entonces la API va bien | Entonces `/cart.js` responde 200 con `item_count: 1` |
| Dado que hay productos | Dado que `/products.json` contiene "Grey jacket" con `available: true` |

- Un escenario = un comportamiento. Si hay "y además" de otro tema, sepáralo.
- Usa los textos exactos observados en el sitio.
- Lo no observable o dudoso va a *Riesgos / observaciones*, no a un escenario.
- Máximo 8 escenarios por feature; si hay más, se divide la feature.
