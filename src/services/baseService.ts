import { isDemoMode } from "../utils/demoMode";
import { demoSaleSummary, demoSales } from "./demoData";

// Only the sales endpoints are faked. Products, categories and inventory are
// real in the database and good enough to demo from; sales are six rows.
const demoResponse = (path: string, options: RequestInit): unknown => {
  if (options.method && options.method !== "GET") return undefined;
  const [route, qs] = path.split("?");
  const q = new URLSearchParams(qs ?? "");
  if (route === "/admin/sales/summary") {
    return demoSaleSummary(q.get("start_date") ?? undefined, q.get("end_date") ?? undefined);
  }
  if (route === "/admin/sales") {
    return demoSales(Number(q.get("page") ?? 1), Number(q.get("page_size") ?? 10));
  }
  return undefined;
};

const baseURL: string =
  import.meta.env.VITE_APP_BASE_URL ||
  "https://appleland-backend-1.onrender.com";

interface RequestError extends Error {
  status?: number;
  response?: { data: unknown };
}

const parseResponse = async (response: Response): Promise<unknown> => {
  const bodyText = await response.text();

  if (!bodyText) {
    return null;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
};

// Demo mode is intercepted here, at the one place every service call passes
// through, so no page or AI tool needs to know about it. It is checked only
// when the flag is explicitly on — never on an error, never on an empty
// response. A silent fallback is what put fabricated numbers on screen twice
// before; see utils/demoMode.
export const request = async <T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  if (isDemoMode()) {
    const canned = demoResponse(path, options);
    if (canned !== undefined) return canned as T;
  }

  const response = await fetch(`${baseURL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const detail =
      (data && typeof data === "object" && "message" in data
        ? (data as { message: string }).message
        : "") ||
      (typeof data === "string" ? data : "") ||
      "";
    const error: RequestError = new Error(
      detail
        ? `${detail} (${response.status})`
        : `Request failed (${response.status})`
    );
    error.status = response.status;
    error.response = { data };
    throw error;
  }

  return data as T;
};
