import { request } from "./baseService";
import type { TicketSaleSummary } from "../types";

export interface PlaygroundTotals {
  revenue_mmk: number;
  paid_tickets: number;
  free_tickets: number;
  total_tickets: number;
  avg_ticket_mmk: number;
  purchases?: number;
}

export interface PlaygroundDay {
  date: string;
  revenue_mmk: number;
  paid_tickets: number;
  free_tickets: number;
  purchases?: number;
}

export interface PlaygroundSummary {
  totals: PlaygroundTotals;
  by_day: PlaygroundDay[];
}

const dateQuery = (start_date: string, end_date: string) => {
  const params = new URLSearchParams({ start_date, end_date });
  return params.toString();
};

export const getPlaygroundSummary = (
  start_date: string,
  end_date: string
): Promise<PlaygroundSummary> =>
  request<TicketSaleSummary[]>(`/admin/playground/summary?${dateQuery(start_date, end_date)}`, {
    method: "GET",
  }).then(rows => {
    const by_day = (Array.isArray(rows) ? rows : []).map(row => ({
      date: row.sale_date,
      revenue_mmk: Number(row.total_sale ?? 0) || 0,
      paid_tickets: Number(row.tickets_sold ?? 0) || 0,
      free_tickets: Number(row.free_tickets_redeemed ?? 0) || 0,
      // How many separate purchases that day. The summary does not carry it
      // yet — one COUNT(*) in the query set-kaung already groups by day — so
      // it stays undefined rather than being guessed at, and the screen shows
      // a different figure until it arrives.
      purchases: row.purchases == null ? undefined : Number(row.purchases) || 0,
    }));
    const totals = by_day.reduce((sum, row) => ({
      revenue_mmk: sum.revenue_mmk + row.revenue_mmk,
      paid_tickets: sum.paid_tickets + row.paid_tickets,
      free_tickets: sum.free_tickets + row.free_tickets,
      // Undefined the moment any day is missing it: a total built from some of
      // the days would read as a real number and be wrong.
      purchases: sum.purchases == null || row.purchases == null
        ? undefined
        : sum.purchases + row.purchases,
    }), { revenue_mmk: 0, paid_tickets: 0, free_tickets: 0, purchases: 0 as number | undefined });
    return {
      by_day,
      totals: {
        ...totals,
        total_tickets: totals.paid_tickets + totals.free_tickets,
        avg_ticket_mmk: totals.paid_tickets ? totals.revenue_mmk / totals.paid_tickets : 0,
        purchases: totals.purchases,
      },
    };
  });

export interface AdminPlaygroundPurchaseRow {
  id: string;
  created_at: string;
  username: string;
  user_id: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  is_free_redemption: boolean;
}

export interface PlaygroundPurchasePage {
  data: AdminPlaygroundPurchaseRow[];
  total_items: number;
  total_pages: number;
  current_page: number;
}

// Every playground sale in the range, one row each.
//
// The summary answers "Tuesday made 40,000" and this answers "made up of
// what" — which is the question staff get asked when a customer disputes a
// charge. `username` here is the CUSTOMER: the endpoint joins users, not
// admins, so the staff member who sold the ticket is not in the response yet.
export const getPlaygroundPurchases = (
  start_date: string,
  end_date: string,
  page = 1,
  page_size = 20
): Promise<PlaygroundPurchasePage> =>
  request(
    `/admin/playground/purchases?${dateQuery(start_date, end_date)}&page=${page}&page_size=${page_size}`,
    { method: "GET" }
  );
