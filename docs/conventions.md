# Convenciones

> Homogeneidad extrema: la IA predice mejor cuando el repo se parece a sí mismo.

## TypeScript

- `strict: true`. Comillas dobles, punto y coma, 2 espacios, líneas ≤ 100.
- Imports: `@playwright/test` primero, luego locales relativos.
- Sin `any`. Las respuestas de API tienen tipo en `tests/support/types.ts`.

## Nombres

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Test UI | `tests/ui/<name>.spec.ts` | `tests/ui/cart.spec.ts` |
| Test API | `tests/api/<name>.spec.ts` | `tests/api/products_api.spec.ts` |
| Page Object | `tests/pages/<Nombre>Page.ts`, clase `PascalCase` | `ProductPage` |
| Helper | `tests/support/<tema>.ts` | `shopifyApi.ts` |

## Forma de un test (obligatoria)

```ts
import { test, expect } from "@playwright/test";
import { ProductPage } from "../pages/ProductPage";

test.describe("Carrito", () => {
  test("CART-01 añade un producto disponible", { tag: ["@CART-01", "@ui"] }, async ({ page }) => {
    const product = new ProductPage(page);
    await product.goto("grey-jacket");
    await product.addToCart();

    await expect(product.header.cartCount).toHaveText("1");
    const cart = await (await page.request.get("/cart.js")).json();
    expect(cart.item_count).toBe(1);
  });
});
```

- Título = `<ID> <comportamiento en minúsculas>`; `tag` incluye `@<ID>` y `@ui` o `@api`.
- Un `test()` por escenario. Pasos largos → `test.step("Cuando ...", ...)`
  usando el texto de la spec.

## Locators (en este orden de preferencia)

1. `getByRole(role, { name })`
2. `getByLabel`, `getByPlaceholder`
3. `getByText` (texto exacto observado)
4. `getByTestId` (si el sitio lo tuviera)
5. CSS/XPath → **solo** con comentario que justifique por qué no hay alternativa.

## Aserciones

- Web-first siempre: `await expect(locator).toBeVisible()`, `toHaveText`, `toHaveURL`.
- Prohibido: `waitForTimeout`, `if (await x.isVisible())` para decidir asserts,
  asserts que solo comprueban "no lanza".
- API: comprobar `status`, forma y valores concretos.

## Page Objects

```ts
import type { Locator, Page } from "@playwright/test";

export class ProductPage {
  readonly addToCartButton: Locator;

  constructor(readonly page: Page) {
    this.addToCartButton = page.getByRole("button", { name: /add to cart/i });
  }

  async goto(handle: string) {
    await this.page.goto(`/products/${handle}`);
  }

  async addToCart() {
    await this.addToCartButton.click();
  }
}
```

- Locators como `readonly` en el constructor; métodos = acciones de negocio.
- Sin `expect`, sin lógica condicional para "esquivar" fallos.

## Bugs conocidos del sitio

```ts
test("CAT-04 ...", { tag: ["@CAT-04", "@ui"] }, async ({ page }) => {
  test.fail(true, "BUG-001: ver progress/bugs.md");
  // ...
});
```

## Comentarios

Por defecto no. Solo para un *por qué* no obvio (selector CSS justificado,
comportamiento raro del sitio documentado en la spec).
