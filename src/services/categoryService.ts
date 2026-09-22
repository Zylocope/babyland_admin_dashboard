import { request } from "./baseService";
import type {
  AdminCategory,
  CreateCategoryPayload,
  DeleteCategoryResponse,
  UpdateCategoryPayload,
} from "../types";

// The backend's UpdateCategoryPayload requires updated_by, but update_category
// overwrites it with the admin id from the session, so the value never reaches
// the database. Sending nil keeps serde happy without threading auth in here.
const IGNORED_BY_SERVER = "00000000-0000-0000-0000-000000000000";

// Categories are soft deleted (is_deleted/deleted_at/deleted_by), and
// get_all_categories has no WHERE clause — deleted rows still come back. Filter
// here rather than in the page: the product form dropdown, the products filter
// and the assistant's list_categories tool all read through this.
// get_all_categories has no WHERE is_deleted = false, so the archived rows come
// back too and have to be filtered here. Kept as the default because almost
// every caller wants live categories only.
export const getCategories = async (): Promise<AdminCategory[]> => {
  const all = await getAllCategoriesIncludingDeleted();
  return all.filter((c) => !c.is_deleted);
};

// The archived rows are the point for the Categories screen: a soft-deleted
// category does not cascade, so products keep pointing at it and then vanish
// from every filter. You cannot show that without the deleted rows.
export const getAllCategoriesIncludingDeleted = async (): Promise<AdminCategory[]> => {
  const all = await request<AdminCategory[]>("/admin/categories", {
    method: "GET",
  });
  return Array.isArray(all) ? all : [];
};

export const createCategory = (name: string): Promise<AdminCategory> =>
  request("/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name } satisfies CreateCategoryPayload),
  });

export const updateCategory = (
  id: string,
  name: string
): Promise<AdminCategory> =>
  request(`/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name,
      updated_by: IGNORED_BY_SERVER,
    } satisfies UpdateCategoryPayload),
  });

export const deleteCategory = (id: string): Promise<DeleteCategoryResponse> =>
  request(`/admin/categories/${id}`, { method: "DELETE" });
