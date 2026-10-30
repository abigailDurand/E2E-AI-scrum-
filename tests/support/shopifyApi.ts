import type { APIRequestContext, APIResponse } from "@playwright/test";
import type { ProductDetail, ProductsListResponse } from "./types";

export class ShopifyApi {
  constructor(readonly request: APIRequestContext) {}

  async getProducts(): Promise<APIResponse> {
    return this.request.get("/products.json");
  }

  async getProductsBody(): Promise<ProductsListResponse> {
    const response = await this.getProducts();
    return (await response.json()) as ProductsListResponse;
  }

  async getProduct(handle: string): Promise<APIResponse> {
    return this.request.get(`/products/${handle}.js`);
  }
}

// /products/<handle>.js llega como text/javascript aunque el cuerpo es JSON (ver spec).
export async function parseProductDetail(response: APIResponse): Promise<ProductDetail> {
  return JSON.parse(await response.text()) as ProductDetail;
}

// Convierte "39.99" a 3999 sin pasar por coma flotante.
export function priceToCents(price: string): number {
  const [units, decimals = ""] = price.split(".");
  return Number(units) * 100 + Number(decimals.padEnd(2, "0").slice(0, 2));
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
