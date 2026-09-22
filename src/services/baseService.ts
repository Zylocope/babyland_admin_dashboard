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

export const request = async <T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  // A multipart upload must carry the browser's own Content-Type, because only
  // the browser knows the boundary string it generated. Forcing
  // application/json here makes the server read the body as one opaque blob and
  // find no file field.
  const isMultipart = options.body instanceof FormData;

  const response = await fetch(`${baseURL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(isMultipart ? {} : { "Content-Type": "application/json" }),
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
