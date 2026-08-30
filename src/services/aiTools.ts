// The "data-driven" half of the assistant: every answer comes from these calls,
// never from the model's memory. Tools run in the browser so they reuse the
// existing admin session — the /api/chat proxy stays blind to shop data.
import { format, subDays } from "date-fns";
import { getSaleSummary } from "./salesService";
import { getAllProducts, searchProductsSimple } from "./productService";
import { getCategories } from "./categoryService";
// @ts-expect-error plain-JS reducer, kept untyped so it runs under bare node in its test
import { summarizeSales } from "./salesRollup.js";
import type { AdminProduct } from "../types";

const today = () => format(new Date(), "yyyy-MM-dd");
const num = (v: string | number | null | undefined) => Number(v ?? 0);

const slim = (p: AdminProduct) => ({
  name: p.name,
  barcode: p.barcode,
  stock: p.quantity_in_stock,
  price_mmk: num(p.selling_price),
  category: p.category ?? null,
  visible_to_customers: p.is_active,
});

const salesSummary = async ({ start_date, end_date }: { start_date?: string; end_date?: string }) => {
  const start = start_date || format(subDays(new Date(), 29), "yyyy-MM-dd");
  const end = end_date || today();
  const rows = await getSaleSummary({ start_date: start, end_date: end });
  if (!rows.length) return { range: { start, end }, note: "No sales recorded in this range." };
  return { range: { start, end }, ...summarizeSales(rows) };
};

const lowStock = async ({ threshold = 5 }: { threshold?: number }) => {
  const products = await getAllProducts();
  const low = products
    .filter((p) => p.quantity_in_stock <= threshold)
    .sort((a, b) => a.quantity_in_stock - b.quantity_in_stock);
  return {
    threshold,
    total_products: products.length,
    low_stock_count: low.length,
    products: low.slice(0, 30).map(slim),
  };
};

const productSearch = async ({ query }: { query: string }) => {
  const res = await searchProductsSimple(query, { page_size: 20 });
  return { query, count: res.data?.length ?? 0, products: (res.data ?? []).map(slim) };
};

const categoryList = async () => {
  const cats = await getCategories();
  return { count: cats.length, categories: cats.map((c) => c.name) };
};

const TOOLS = {
  sales_summary: salesSummary,
  low_stock: lowStock,
  search_products: productSearch,
  list_categories: categoryList,
} as const;

export const toolDeclarations = [
  {
    name: "sales_summary",
    description:
      "Revenue, cost, profit, margin, transaction count, items sold and average basket for a date range, split by in-store vs online, plus a per-day breakdown. Defaults to the last 30 days.",
    parameters: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Inclusive start date, YYYY-MM-DD." },
        end_date: { type: "string", description: "Inclusive end date, YYYY-MM-DD." },
      },
    },
  },
  {
    name: "low_stock",
    description: "Products at or below a stock threshold, lowest first, plus the total product count.",
    parameters: {
      type: "object",
      properties: {
        threshold: { type: "number", description: "Stock level to flag at or below. Default 5." },
      },
    },
  },
  {
    name: "search_products",
    description: "Look up products by name or barcode. Returns stock, price and category.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Product name or barcode." } },
      required: ["query"],
    },
  },
  {
    name: "list_categories",
    description: "All product category names.",
    parameters: { type: "object", properties: {} },
  },
];

export const runTool = async (name: string, args: Record<string, unknown>) => {
  const fn = TOOLS[name as keyof typeof TOOLS];
  if (!fn) return { error: `Unknown tool: ${name}` };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (fn as any)(args);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tool call failed" };
  }
};

export const systemPrompt = () => `You are the Appleland admin assistant. Appleland is a baby store and indoor playground in Naypyidaw, Myanmar.

Today is ${today()}.

Rules:
- Answer only from tool results. Never guess a number. If a tool returns nothing, say the data is not recorded yet.
- Call tools before answering any question about sales, stock, products or categories.
- All money is Myanmar Kyat. Write it like 12,500 MMK — never lakh, never crore.
- Be brief. Lead with the number the manager asked for, then at most two lines of context.
- Write plain text. No markdown — no **bold**, no ##headings, no tables. Use "-" for lists.
- The shop does not handle product returns or refunds; there is no returns data.
- Payments breakdown, per-cashier sales and best-selling products are not available yet — say so plainly instead of estimating.
- Reply in the language the manager writes in (English or Burmese).`;
