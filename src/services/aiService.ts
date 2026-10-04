import { baseURL } from "./baseService";

// The assistant's one call to Gemini, now through the backend instead of the
// Vercel function.
//
// Why it moved: `api/chat.js` is a public URL with no authentication. Its only
// gate was a per-IP counter held in process memory, which reset on every cold
// start — a quota guard, never auth. Anyone who found the URL could spend the
// shop's Gemini allowance. `POST /admin/ai/chat` checks the admin session,
// requires the manager role, holds the key server-side and keeps a durable
// per-admin daily limit.
//
// The backend relays the body to Gemini untouched and returns its status and
// body untouched, so the request shape and the response parsing below are
// exactly what they were against the proxy. Only the address and the session
// cookie changed.
//
// It is deliberately NOT routed through baseService.request: that helper turns
// any non-2xx into a generic Error, and this call has to tell a daily limit
// from an upstream timeout from a role refusal.
//
// The model comes from the backend's GEMINI_MODEL setting on Render (its code
// default, gemini-2.5-flash, is retired and answers 404). If every question
// fails with a 404 message, that setting is missing; flipping this back to
// false falls back to the Vercel proxy.

export class AiError extends Error {
  kind: "auth" | "role" | "quota" | "timeout" | "blocked" | "other";
  constructor(kind: AiError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface GeminiContent {
  role?: string;
  parts: unknown[];
}

const USE_BACKEND = true;

export const askGeminiViaBackend = async (
  body: unknown,
  signal?: AbortSignal
): Promise<GeminiContent> => {
  const res = USE_BACKEND
    ? await fetch(`${baseURL}/admin/ai/chat`, {
        method: "POST",
        signal,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    : await fetch("/api/chat", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

  let data: {
    candidates?: { content?: GeminiContent }[];
    promptFeedback?: { blockReason?: string };
    error?: { message?: string; status?: string };
  } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // The backend's own refusals come back before Gemini is ever called, so
    // they are the ones worth naming precisely — a manager seeing "AI request
    // failed (403)" learns nothing.
    if (res.status === 401) throw new AiError("auth", "SESSION");
    if (res.status === 403) throw new AiError("role", "ROLE");
    if (res.status === 429) throw new AiError("quota", "QUOTA");
    if (res.status === 504) throw new AiError("timeout", "TIMEOUT");
    // Gemini's own 429 is relayed with its status, so it lands above; this is
    // anything else it chose to say.
    if (data?.error?.status === "RESOURCE_EXHAUSTED") throw new AiError("quota", "QUOTA");
    throw new AiError("other", data?.error?.message || `AI request failed (${res.status})`);
  }

  const content = data?.candidates?.[0]?.content;
  if (!content) {
    throw new AiError("blocked", data?.promptFeedback?.blockReason || "Empty response from AI");
  }
  return content;
};
