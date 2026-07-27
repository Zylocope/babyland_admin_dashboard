import { request } from "./baseService";
import type {
  Admin,
  LoginRequest,
} from "../types";

export const loginAdmin = (credentials: LoginRequest): Promise<Admin> =>
  request("/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const logoutAdmin = (): Promise<void> =>
  request("/admin/logout", {
    method: "POST",
  });
