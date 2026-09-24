import { request } from "./baseService";
import type { PaginatedResponseUserResponse } from "../types";

// Customers are the mobile app's `users`. Manager-only on the server
// (RequiresRole<SuperAdminRole>). page_size is clamped to 1..100 server-side.
export const getCustomers = (
  page = 1,
  page_size = 20
): Promise<PaginatedResponseUserResponse> => {
  const params = new URLSearchParams({ page: String(page), page_size: String(page_size) });
  return request(`/admin/users?${params}`, { method: "GET" });
};
