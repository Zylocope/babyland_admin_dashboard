import { request } from "./baseService";

export const getAllProducts = () =>
  request("/admin/products/all", {
    method: "GET",
  });

export const getProductsPaged = () =>
  request("/admin/products", {
    method: "GET",
  });

export const getProductById = (productId) =>
  request(`/admin/products/${productId}`, {
    method: "GET",
  });

export const createProduct = (body) =>
  request("/admin/products", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateProduct = (id, body) =>
  request(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteProduct = (productId) =>
  request(`/admin/products/${productId}`, {
    method: "DELETE",
  });

export const searchProductsSimple = (query, { page = 1, page_size = 10, category_id } = {}) => {
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

// PENDING BACKEND: POST /admin/sales does not exist yet (sales are read-only).
// Proposed minimal contract — backend resolves inventory batch (FIFO), cost_price,
// and total from these lines. Confirm shape with set-kaung before relying on it.
export const createSale = (items) =>
  request("/admin/sales", {
    method: "POST",
    body: JSON.stringify({ items }), // items: [{ product_id, quantity, selling_price }]
  });

export const searchProductsAdvanced = (body, { page = 1, limit = 10 } = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  return request(`/admin/products/search/advanced?${params}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
};
