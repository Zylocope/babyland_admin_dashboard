import { request } from "./baseService";

// The single door every product and category report goes through.
//
// Right now it walks receipts in the browser, because `GET /admin/sales` lists
// sales without their line items and only `GET /admin/sales/{id}` carries them.
// Set Kaung is adding `/admin/analytics/product-performance` and `/by-category`
// over the same tables, and when they land only this file changes — the Sales
// page, the two assistant tools and anything added later keep calling these
// same two functions and never learn where the numbers came from.
//
// That is the entire point of the indirection. The walk is a stopgap sitting
// behind a shape that matches what the endpoints will return, so switching is
// deleting a branch rather than rewriting callers.

// One switch per endpoint, because they land separately. Product performance
// is live under /admin/analytics/ai/; by-category is not built yet, and its
// browser path below already reads products through the backend.
const PRODUCTS_FROM_BACKEND = true;
const CATEGORIES_FROM_BACKEND = false;

export interface ProductSalesRow {
  product_id: string;
  name: string;
  units: number;
  revenue_mmk: number;
  cost_mmk: number;
  profit_mmk: number;
}

export interface CategorySalesRow {
  category: string;
  units: number;
  revenue_mmk: number;
  profit_mmk: number;
  products: number;
}

// Every report carries how much of the range it actually saw.
//
// `complete` is false when the walk hit its cap or a receipt would not load.
// It is not decoration: a ranking built from part of a range while presenting
// itself as the whole range is the bug this codebase has shipped three times,
// and the assistant's tool description tells the model to say so out loud.
// The backend version will always be complete, which is most of why it is
// worth having.
export interface Coverage {
  complete: boolean;
  receipts_read: number;
  receipts_unreadable: number;
}

export type ProductSalesResult = Coverage & { rows: ProductSalesRow[] };
export type CategorySalesResult = Coverage & { rows: CategorySalesRow[] };

const num = (v: unknown) => Number(v ?? 0) || 0;
const MAX_PAGES = 20;

interface BackendProductRow {
  product_id: string;
  name: string;
  units_sold: number;
  revenue: string;
  cost: string;
  profit: string;
}

interface BackendCategoryRow {
  category: string;
  units_sold: number;
  revenue: string;
  profit: string;
  products?: number;
}

export const getProductSales = async (
  start: string,
  end: string
): Promise<ProductSalesResult> => {
  if (PRODUCTS_FROM_BACKEND) {
    // Every page, not the first: a ranking from page one presenting itself as
    // the whole range is the truncation bug this file exists to prevent.
    // ponytail: the server sort has no tiebreak, so equal rows could shift
    // between pages; one page of 100 covers today's catalogue, and the dedupe
    // only stops a repeat, it cannot recover a skipped row.
    const seen = new Map<string, BackendProductRow>();
    let page = 1;
    let pages = 1;
    do {
      const res = await request<{ data: BackendProductRow[]; total_pages: number }>(
        `/admin/analytics/ai/product-performance?start_date=${start}&end_date=${end}&sort=units&page=${page}&page_size=100`,
        { method: "GET" }
      );
      for (const r of res?.data ?? []) seen.set(r.product_id, r);
      pages = num(res?.total_pages);
      page += 1;
    } while (page <= pages && page <= MAX_PAGES);
    return {
      complete: pages <= MAX_PAGES,
      receipts_read: 0,
      receipts_unreadable: 0,
      rows: [...seen.values()].map(r => ({
        product_id: r.product_id,
        name: r.name,
        units: num(r.units_sold),
        revenue_mmk: num(r.revenue),
        cost_mmk: num(r.cost),
        profit_mmk: num(r.profit),
      })),
    };
  }

  const { productSales } = await import("./productSales.js");
  const { getSales, getSaleDetail } = await import("./salesService");
  const out = await productSales({ start, end, listSales: getSales, loadSale: getSaleDetail });
  return {
    complete: !out.truncated && out.failed === 0,
    receipts_read: out.receipts,
    receipts_unreadable: out.failed,
    rows: out.rows,
  };
};

export const getCategorySales = async (
  start: string,
  end: string
): Promise<CategorySalesResult> => {
  if (CATEGORIES_FROM_BACKEND) {
    const res = await request<{ data: BackendCategoryRow[] }>(
      `/admin/analytics/ai/by-category?start_date=${start}&end_date=${end}`,
      { method: "GET" }
    );
    return {
      complete: true,
      receipts_read: 0,
      receipts_unreadable: 0,
      rows: (res?.data ?? []).map(r => ({
        category: r.category,
        units: num(r.units_sold),
        revenue_mmk: num(r.revenue),
        profit_mmk: num(r.profit),
        products: num(r.products),
      })),
    };
  }

  // The category is not on a sale line, so the browser path joins it from the
  // catalogue by product id. The backend will group by category_id directly and
  // this import disappears with the rest of the walk.
  const [{ categorySales }, { getAllProducts }, sold] = await Promise.all([
    import("./productSales.js"),
    import("./productService"),
    getProductSales(start, end),
  ]);
  const products = await getAllProducts();
  return {
    complete: sold.complete,
    receipts_read: sold.receipts_read,
    receipts_unreadable: sold.receipts_unreadable,
    rows: categorySales(sold.rows, products),
  };
};
