---
feature_id: 0
name: nombre_feature
tag: TAG
type: ui | api | ui+api
author: spec-writer
---

# <Título de la feature>

## Contexto

_Qué parte del sitio cubre y por qué importa. 2-4 líneas. Incluye lo que se
observó explorando el sitio (URLs reales, textos reales de botones)._

## Datos de prueba

| Dato | Valor | Origen |
|------|-------|--------|
| producto disponible | Grey jacket (`grey-jacket`) | /products.json |

## Escenarios

### TAG-01 — <comportamiento observable en una frase>

- **Tipo:** ui | api
- **Prioridad:** alta | media | baja
- **Criterio cubierto:** <texto del acceptance de feature_list.json>
- **Dado** <estado inicial>
- **Cuando** <acción del usuario o request>
- **Entonces** <resultado verificable concreto>
- **Y** <resultado adicional opcional>

### TAG-02 — <...>

- **Tipo:** ui
- **Prioridad:** media
- **Criterio cubierto:** <...>
- **Dado** <...>
- **Cuando** <...>
- **Entonces** <...>

## Fuera de alcance

- _Lo que NO se prueba aquí y por qué._

## Riesgos / observaciones

- _Comportamientos raros detectados al explorar (p. ej. moneda distinta UI/API)._
