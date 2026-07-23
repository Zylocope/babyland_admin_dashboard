import { request } from "./baseService";

export const getCategories = () =>
  request("/admin/categories", {
    method: "GET",
  });

export const createCategory = (name) =>
  request("/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
