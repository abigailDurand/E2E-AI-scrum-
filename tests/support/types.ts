export interface ListedVariant {
  id: number;
  price: string;
  available: boolean;
}

export interface ListedProduct {
  id: number;
  title: string;
  handle: string;
  variants: ListedVariant[];
}

export interface ProductsListResponse {
  products: ListedProduct[];
}

export interface ProductDetailVariant {
  id: number;
  price: number;
  available: boolean;
}

export interface ProductDetail {
  id: number;
  title: string;
  handle: string;
  variants: ProductDetailVariant[];
}
