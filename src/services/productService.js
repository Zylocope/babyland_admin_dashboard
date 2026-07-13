import { request } from "./baseService";

export const getAllProducts = () =>
  request("/admin/products/all", {
    method: "GET",
  });

export const getProductsPaged = () =>
  request("/admin/products", {
    method: "GET",
  });

export const searchProductsSimple = (query, limit = 10, offset = 0) => {
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  return request(`/admin/products/search?${params}`, {
    method: "GET",
  });
};
