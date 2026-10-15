import { request } from "./baseService";

// Backend 3e9431c. Delete is a soft delete; the list hides deleted suppliers.
export interface Supplier {
  id: string;
  name: string;
  contact_number: string;
  created_at: string;
  is_deleted: boolean;
}
export interface SupplierPayload {
  name: string;
  contact_number: string;
}

export const getSuppliers = (): Promise<Supplier[]> =>
  request("/admin/suppliers", { method: "GET" });

export const createSupplier = (body: SupplierPayload): Promise<Supplier> =>
  request("/admin/suppliers", { method: "POST", body: JSON.stringify(body) });

export const updateSupplier = (id: string, body: SupplierPayload): Promise<Supplier> =>
  request(`/admin/suppliers/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteSupplier = (id: string): Promise<unknown> =>
  request(`/admin/suppliers/${id}`, { method: "DELETE" });
