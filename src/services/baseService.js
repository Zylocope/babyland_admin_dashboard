const baseURL =
  import.meta.env.VITE_APP_BASE_URL ||
  "https://appleland-backend-1.onrender.com";

const parseResponse = async (response) => {
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

export const request = async (path, options = {}) => {
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
    const error = new Error(data?.message || "Request failed.");
    error.status = response.status;
    error.response = { data };
    throw error;
  }

  return data;
};

export const loginAdmin = (credentials) =>
  request("/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const logoutAdmin = () =>
  request("/admin/logout", {
    method: "POST",
  });

export const getAllProducts = () =>
  request("/admin/products/all", {
    method: "GET",
  });
