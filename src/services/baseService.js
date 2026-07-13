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
    // Backend sends plain-text bodies ("invalid credentials", "forbidden"),
    // so surface that + the status instead of a blank "Request failed."
    const detail = data?.message || (typeof data === "string" ? data : "") || "";
    const error = new Error(detail ? `${detail} (${response.status})` : `Request failed (${response.status})`);
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

export const getProducts = ({ page = 1, limit = 20 } = {}) =>
  request(`/admin/products?page=${page}&limit=${limit}`, {
    method: "GET",
  });

export const createProduct = (body) =>
  request("/admin/products", {
    method: "POST",
    body: JSON.stringify(body),
  });

// Update is a full-body replace: PATCH is 405, PUT requires every field.
export const updateProduct = (id, body) =>
  request(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const getCategories = () =>
  request("/admin/categories", {
    method: "GET",
  });

export const createCategory = (name) =>
  request("/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
