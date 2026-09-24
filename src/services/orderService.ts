import { request } from "./baseService";
import type {
  AdminOrderDetail,
  AdminOrderRow,
  PaginatedResponseAdminOrderRow,
} from "../types";

// Delivery status as the wire spells it. The database stores lowercase but
// serde serialises the Rust variants, so these are the strings that travel —
// an earlier version of the Orders screen invented Processing/Shipped/Delivered
// and matched none of them.
export const ORDER_STATUSES = ["Pending", "OnDelivery", "Received"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// The next status in the chain, or null at the end. Advancing past Received is
// not a thing the server will do, so the UI does not offer it.
export const nextStatus = (status: string): OrderStatus | null => {
  const at = (ORDER_STATUSES as readonly string[]).indexOf(status);
  return at === -1 || at === ORDER_STATUSES.length - 1
    ? null
    : ORDER_STATUSES[at + 1];
};

export interface OrderQuery {
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export const getOrders = (
  query: OrderQuery = {}
): Promise<PaginatedResponseAdminOrderRow> => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && value !== "All") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return request(`/admin/orders${qs ? `?${qs}` : ""}`, { method: "GET" });
};

export const getOrderDetail = (orderId: string): Promise<AdminOrderDetail> =>
  request(`/admin/orders/${orderId}`, { method: "GET" });

// Moves the order one step along. The server decides the next value from the
// current one — there is no status in the body — so calling it twice advances
// twice, which is why the screen asks before sending.
export const advanceOrderStatus = (orderId: string): Promise<unknown> =>
  request(`/admin/orders/update_status/${orderId}`, { method: "PATCH" });

export type { AdminOrderRow, AdminOrderDetail };
