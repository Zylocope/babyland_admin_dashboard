import { request } from "./baseService";
import type {
  AdminInventory,
  AdminProduct,
  CreateProductPayload,
  CreateSalePayload,
  UpdateProductPayload,
  ProductSearchParamsAdmin,
  PaginatedResponseAdminProduct,
} from "../types";

export const getAllProducts = (): Promise<AdminProduct[]> =>
  request("/admin/products/all", {
    method: "GET",
  });

export const getProductsPaged = (): Promise<PaginatedResponseAdminProduct> =>
  request("/admin/products", {
    method: "GET",
  });

export const getProductById = (productId: string): Promise<AdminProduct> =>
  request(`/admin/products/${productId}`, {
    method: "GET",
  });

export const createProduct = (body: CreateProductPayload): Promise<AdminProduct> =>
  request("/admin/products", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateProduct = (
  id: string,
  body: UpdateProductPayload
): Promise<AdminProduct> =>
  request(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteProduct = (productId: string): Promise<void> =>
  request(`/admin/products/${productId}`, {
    method: "DELETE",
  });

interface SearchOptions {
  page?: number;
  page_size?: number;
  category_id?: string;
}

export const searchProductsSimple = (
  query: string,
  { page = 1, page_size = 10, category_id }: SearchOptions = {}
): Promise<PaginatedResponseAdminProduct> => {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    page_size: page_size.toString(),
  });

  if (category_id) params.set("category_id", category_id);

  return request(`/admin/products/search?${params}`, {
    method: "GET",
  });
};

interface AdvancedSearchOptions {
  page?: number;
  limit?: number;
}

export const searchProductsAdvanced = (
  body: ProductSearchParamsAdmin,
  { page = 1, limit = 10 }: AdvancedSearchOptions = {}
): Promise<PaginatedResponseAdminProduct> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  return request(`/admin/products/search/advanced?${params}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const createSale = (body: CreateSalePayload): Promise<string> =>
  request("/admin/sales", {
    method: "POST",
    body: JSON.stringify(body),
  });

// The generated types predate GET /admin/inventory/{id}; regenerate from the
// backend spec when the openapi pass happens and drop this.
export interface PaginatedInventory {
  data: AdminInventory[];
  total_items: number;
  total_pages: number;
  current_page: number;
}

export const getInventoryRecords = (
  productId: string,
  { page = 1, page_size = 20 }: { page?: number; page_size?: number } = {}
): Promise<PaginatedInventory> =>
  request(`/admin/inventory/${productId}?page=${page}&page_size=${page_size}`, {
    method: "GET",
  });

// received_at / expiry_date exist on the backend but not yet in the generated
// types. expiry_date is required for perishable products and rejected for the rest.
export interface StockInPayload {
  quantity_received: number;
  unit_cost: string;
  received_at?: string;
  expiry_date?: string;
}

export const insertInventory = (
  productId: string,
  body: StockInPayload
): Promise<AdminInventory> =>
  request(`/admin/inventory/${productId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
