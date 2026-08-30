// The "data-driven" half of the assistant: every answer comes from these calls,
// never from the model's memory. Tools run in the browser so they reuse the
// existing admin session — the /api/chat proxy stays blind to shop data.
import { format, subDays, parseISO, getDay } from "date-fns";
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

// "Am I doing better than last time" — the question a dashboard cannot answer
// with one number. Runs the same summary over two adjacent ranges.
const comparePeriods = async ({ period = "month" }: { period?: "week" | "month" }) => {
  const span = period === "week" ? 7 : 30;
  const curStart = format(subDays(new Date(), span - 1), "yyyy-MM-dd");
  const curEnd = today();
  const prevStart = format(subDays(new Date(), span * 2 - 1), "yyyy-MM-dd");
  const prevEnd = format(subDays(new Date(), span), "yyyy-MM-dd");

  const [cur, prev] = await Promise.all([
    getSaleSummary({ start_date: curStart, end_date: curEnd }),
    getSaleSummary({ start_date: prevStart, end_date: prevEnd }),
  ]);

  const a = summarizeSales(cur).totals;
  const b = summarizeSales(prev).totals;
  const change = (now: number, before: number) =>
    before ? Math.round(((now - before) / before) * 1000) / 10 : null;

  return {
    period,
    current: { range: { start: curStart, end: curEnd }, ...a },
    previous: { range: { start: prevStart, end: prevEnd }, ...b },
    change_pct: {
      revenue: change(a.revenue_mmk, b.revenue_mmk),
      profit: change(a.profit_mmk, b.profit_mmk),
      transactions: change(a.transactions, b.transactions),
    },
  };
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Which days actually earn — staffing and opening-hours decisions come from this.
const salesByWeekday = async ({ start_date, end_date }: { start_date?: string; end_date?: string }) => {
  const start = start_date || format(subDays(new Date(), 89), "yyyy-MM-dd");
  const end = end_date || today();
  const rows = await getSaleSummary({ start_date: start, end_date: end });
  if (!rows.length) return { range: { start, end }, note: "No sales recorded in this range." };

  const buckets = WEEKDAYS.map((name) => ({ weekday: name, revenue_mmk: 0, transactions: 0, days: 0 }));
  const seen = new Set<string>();
  for (const r of rows) {
    const idx = getDay(parseISO(r.sale_date));
    const bucket = buckets[idx];
    if (!bucket) continue;
    bucket.revenue_mmk += num(r.total_sale);
    bucket.transactions += r.transactions;
    const key = `${idx}:${r.sale_date}`;
    if (!seen.has(key)) { seen.add(key); bucket.days += 1; }
  }

  return {
    range: { start, end },
    by_weekday: buckets.map((b) => ({
      ...b,
      revenue_mmk: Math.round(b.revenue_mmk),
      avg_per_day_mmk: b.days ? Math.round(b.revenue_mmk / b.days) : 0,
    })),
  };
};

// Where the money is sitting on the shelf, valued at retail (products carry a
// selling price, not a cost — batch cost lives on inventory).
const stockByCategory = async () => {
  const products = await getAllProducts();
  const groups = new Map<string, { category: string; products: number; units: number; retail_value_mmk: number }>();
  for (const p of products) {
    const key = p.category ?? "Uncategorised";
    const g = groups.get(key) ?? { category: key, products: 0, units: 0, retail_value_mmk: 0 };
    g.products += 1;
    g.units += p.quantity_in_stock;
    g.retail_value_mmk += p.quantity_in_stock * num(p.selling_price);
    groups.set(key, g);
  }
  return {
    total_products: products.length,
    categories: [...groups.values()]
      .map((g) => ({ ...g, retail_value_mmk: Math.round(g.retail_value_mmk) }))
      .sort((a, b) => b.retail_value_mmk - a.retail_value_mmk),
  };
};

const TOOLS = {
  compare_periods: comparePeriods,
  sales_by_weekday: salesByWeekday,
  stock_by_category: stockByCategory,
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
    name: "compare_periods",
    description:
      "Compares this week against last week, or this month against last month: revenue, profit, transactions and the percentage change. Use for any 'better or worse than before' question.",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["week", "month"], description: "Comparison window. Default month." },
      },
    },
  },
  {
    name: "sales_by_weekday",
    description:
      "Revenue and transactions grouped by day of the week, plus the average per occurrence of that day. Use for questions about which days are busiest or quietest. Defaults to the last 90 days.",
    parameters: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Inclusive start date, YYYY-MM-DD." },
        end_date: { type: "string", description: "Inclusive end date, YYYY-MM-DD." },
      },
    },
  },
  {
    name: "stock_by_category",
    description:
      "Current stock grouped by category: product count, units on hand, and retail value. Use for questions about where stock or money is concentrated.",
    parameters: { type: "object", properties: {} },
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
