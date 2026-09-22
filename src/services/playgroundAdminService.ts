import { request } from "./baseService";

export interface PlaygroundTotals {
  revenue_mmk: number;
  paid_tickets: number;
  free_tickets: number;
  transactions: number;
  avg_purchase_mmk: number;
}

export interface PlaygroundDay {
  date: string;
  revenue_mmk: number;
  paid_tickets: number;
  free_tickets: number;
  transactions: number;
}

export interface PlaygroundSummary {
  totals: PlaygroundTotals;
  by_day: PlaygroundDay[];
}

export interface PlaygroundPurchase {
  id: string;
  created_at: string;
  paid_quantity: number;
  free_quantity: number;
  total_amount: number | string;
  staff_name?: string | null;
}

interface PaginatedPlaygroundPurchases {
  data: PlaygroundPurchase[];
  total_items: number;
}

const dateQuery = (start_date: string, end_date: string) => {
  const params = new URLSearchParams({ start_date, end_date });
  return params.toString();
};

export const getPlaygroundSummary = (
  start_date: string,
  end_date: string
): Promise<PlaygroundSummary> =>
  request(`/admin/playground/summary?${dateQuery(start_date, end_date)}`, {
    method: "GET",
  });

export const getPlaygroundPurchases = (
  start_date: string,
  end_date: string,
  page = 1,
  page_size = 20
): Promise<PaginatedPlaygroundPurchases> => {
  const params = new URLSearchParams({
    start_date,
    end_date,
    page: String(page),
    page_size: String(page_size),
  });
  return request(`/admin/playground/purchases?${params}`, { method: "GET" });
};
