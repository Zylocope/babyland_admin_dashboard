import { request } from "./baseService";

export const loginAdmin = (credentials) =>
  request("/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const logoutAdmin = () =>
  request("/admin/logout", {
    method: "POST",
  });
