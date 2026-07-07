import request from "./baseService";

export const getAllProducts = () =>
  request("/admin/products/all", {
    method: "GET",
  });

export const getProductsPaged = () =>
  request("/admin/products", {
    method: "GET",
  });
