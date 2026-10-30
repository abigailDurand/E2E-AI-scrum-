import { test, expect } from "@playwright/test";
import {
  ShopifyApi,
  mapWithConcurrency,
  parseProductDetail,
  priceToCents,
} from "../support/shopifyApi";
import type { ProductsListResponse } from "../support/types";

const GREY_JACKET = {
  handle: "grey-jacket",
  title: "Grey jacket",
  id: 263739389,
  variantId: 611945025,
  price: "55.00",
};
const BROWN_SHADES_VARIANT_ID = 1063105029;
const MISSING_HANDLE = "no-existe-xyz-123";
const PRICE_PATTERN = /^\d+\.\d{2}$/;
// Secuencial: con 2 en paralelo Shopify devolvió 429 (la spec permite <= 2).
const MAX_CONCURRENCY = 1;

test.describe("Contrato de la API de productos", () => {
  test(
    "PAPI-01 el listado de productos responde 200 con id, title, handle y variants",
    { tag: ["@PAPI-01", "@api"] },
    async ({ request }) => {
      const api = new ShopifyApi(request);
      const response = await api.getProducts();

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/json");

      const body: unknown = await response.json();
      expect(body).toEqual(expect.objectContaining({ products: expect.any(Array) }));
      const { products } = body as ProductsListResponse;
      expect(products.length).toBeGreaterThanOrEqual(1);

      for (const product of products) {
        expect(typeof product.id, `id de ${product.handle}`).toBe("number");
        expect(typeof product.title, `title de ${product.handle}`).toBe("string");
        expect(product.title.length, `title de ${product.handle}`).toBeGreaterThan(0);
        expect(typeof product.handle, `handle de ${product.id}`).toBe("string");
        expect(product.handle.length, `handle de ${product.id}`).toBeGreaterThan(0);
        expect(Array.isArray(product.variants), `variants de ${product.handle}`).toBe(true);
        expect(product.variants.length, `variants de ${product.handle}`).toBeGreaterThanOrEqual(1);
      }

      expect(products).toContainEqual(
        expect.objectContaining({
          handle: GREY_JACKET.handle,
          title: GREY_JACKET.title,
          id: GREY_JACKET.id,
        }),
      );
    },
  );

  test(
    "PAPI-02 cada variante del listado tiene id, price y available",
    { tag: ["@PAPI-02", "@api"] },
    async ({ request }) => {
      const api = new ShopifyApi(request);
      const { products } = await api.getProductsBody();
      const variants = products.flatMap((product) => product.variants);
      expect(variants.length).toBeGreaterThanOrEqual(1);

      for (const variant of variants) {
        expect(typeof variant.id, `id de variante`).toBe("number");
        expect(variant.price, `price de variante ${variant.id}`).toMatch(PRICE_PATTERN);
        expect(typeof variant.available, `available de variante ${variant.id}`).toBe("boolean");
      }

      expect(variants).toContainEqual(
        expect.objectContaining({ id: GREY_JACKET.variantId, price: "55.00", available: true }),
      );
      expect(variants).toContainEqual(
        expect.objectContaining({ id: BROWN_SHADES_VARIANT_ID, price: "20.00", available: false }),
      );
    },
  );

  test(
    "PAPI-03 la ficha de un producto por handle coincide con su entrada del listado",
    { tag: ["@PAPI-03", "@api"] },
    async ({ request }) => {
      const api = new ShopifyApi(request);

      await test.step("Dado que /products.json contiene \"Grey jacket\"", async () => {
        const { products } = await api.getProductsBody();
        const listed = products.find((product) => product.handle === GREY_JACKET.handle);
        expect(listed).toEqual(
          expect.objectContaining({ id: GREY_JACKET.id, title: GREY_JACKET.title }),
        );
        expect(listed?.variants).toEqual([
          expect.objectContaining({ id: GREY_JACKET.variantId, price: GREY_JACKET.price }),
        ]);
      });

      const response = await test.step("Cuando se hace GET /products/grey-jacket.js", () =>
        api.getProduct(GREY_JACKET.handle),
      );

      expect(response.status()).toBe(200);
      const detail = await parseProductDetail(response);
      expect(detail.id).toBe(GREY_JACKET.id);
      expect(detail.title).toBe(GREY_JACKET.title);
      expect(detail.handle).toBe(GREY_JACKET.handle);
      expect(detail.variants).toHaveLength(1);
      expect(detail.variants[0]).toEqual(
        expect.objectContaining({
          id: GREY_JACKET.variantId,
          available: true,
          price: priceToCents(GREY_JACKET.price),
        }),
      );
      expect(detail.variants[0].price).toBe(5500);
    },
  );

  test(
    "PAPI-04 todos los productos del listado son coherentes con su ficha por handle",
    { tag: ["@PAPI-04", "@api"] },
    async ({ request }) => {
      const api = new ShopifyApi(request);
      const { products } = await api.getProductsBody();
      expect(products.length).toBeGreaterThanOrEqual(1);

      const details = await test.step(
        "Cuando se hace GET /products/<handle>.js para cada handle del listado",
        () =>
          mapWithConcurrency(products, MAX_CONCURRENCY, async (product) => {
            const response = await api.getProduct(product.handle);
            return { handle: product.handle, status: response.status(), response };
          }),
      );

      for (const [index, product] of products.entries()) {
        const { status, response } = details[index];
        expect(status, `status de /products/${product.handle}.js`).toBe(200);
        const detail = await parseProductDetail(response);

        expect(
          { id: detail.id, title: detail.title, handle: detail.handle },
          `producto ${product.handle}`,
        ).toEqual({ id: product.id, title: product.title, handle: product.handle });

        const listedVariants = product.variants
          .map((variant) => ({
            id: variant.id,
            available: variant.available,
            price: priceToCents(variant.price),
          }))
          .sort((a, b) => a.id - b.id);
        const detailVariants = detail.variants
          .map((variant) => ({
            id: variant.id,
            available: variant.available,
            price: variant.price,
          }))
          .sort((a, b) => a.id - b.id);
        expect(detailVariants, `variantes de ${product.handle}`).toEqual(listedVariants);
      }
    },
  );

  test(
    "PAPI-05 un handle inexistente responde 404",
    { tag: ["@PAPI-05", "@api"] },
    async ({ request }) => {
      const api = new ShopifyApi(request);

      await test.step(`Dado que ningún producto tiene el handle ${MISSING_HANDLE}`, async () => {
        const { products } = await api.getProductsBody();
        expect(products.map((product) => product.handle)).not.toContain(MISSING_HANDLE);
      });

      const response = await api.getProduct(MISSING_HANDLE);

      expect(response.status()).toBe(404);
      expect(await response.text()).toBe("");
    },
  );
});
