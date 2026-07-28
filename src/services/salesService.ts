import { request } from "./baseService";
import type {
  AdminSaleDetails,
  PaginatedResponseAdminSale,
  SaleSummary,
} from "../types";

export const getSales = (
  page = 1,
  page_size = 10
): Promise<PaginatedResponseAdminSale> =>
  request(`/admin/sales?page=${page}&page_size=${page_size}`, {
    method: "GET",
  });

export const getSaleDetail = (saleId: string): Promise<AdminSaleDetails> =>
  request(`/admin/sales/${saleId}`, {
    method: "GET",
  });

export const getSaleSummary = (params: {
  start_date?: string;
  end_date?: string;
} = {}): Promise<SaleSummary[]> => {
  const search = new URLSearchParams();
  if (params.start_date) search.set("start_date", params.start_date);
  if (params.end_date) search.set("end_date", params.end_date);
  const query = search.toString();
  return request(`/admin/sales/summary${query ? `?${query}` : ""}`, {
    method: "GET",
  });
};
