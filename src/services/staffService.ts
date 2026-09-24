import { request } from "./baseService";
import type { AdminStaff } from "../types";

// The OpenAPI spec says this returns one AdminStaff; the handler returns
// Vec<AdminStaff>. Typed to what the server actually sends.
export const getStaff = (): Promise<AdminStaff[]> =>
  request("/admin/staff", { method: "GET" });
