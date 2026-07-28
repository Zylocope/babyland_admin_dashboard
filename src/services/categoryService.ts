import { request } from "./baseService";
import type {
  AdminCategory,
  CreateCategoryPayload,
} from "../types";

export const getCategories = (): Promise<AdminCategory[]> =>
  request("/admin/categories", {
    method: "GET",
  });

export const createCategory = (name: string): Promise<AdminCategory> =>
  request("/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name } satisfies CreateCategoryPayload),
  });
