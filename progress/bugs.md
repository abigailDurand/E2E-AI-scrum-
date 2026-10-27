# Bugs del sitio bajo prueba (append-only)

> Lo escribe el `failure-triager` cuando clasifica un fallo como `APP_BUG`
> y lo ha reproducido contra el sitio real. Los tests afectados usan
> `test.fail(true, "BUG-00x: ...")` referenciando la entrada.

Formato:

```markdown
## BUG-001 — <título corto>
- **Escenario:** CART-03 (`specs/cart.md`)
- **Detectado:** AAAA-MM-DD
- **Pasos:** 1. ... 2. ...
- **Esperado:** ...
- **Obtenido:** ...
- **Evidencia:** URL, extracto de respuesta, ruta de trace
- **Estado:** abierto | ya no se reproduce (AAAA-MM-DD)
```

---
