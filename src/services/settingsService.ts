import { request } from "./baseService";
import type { SettingResponse, UpdateSettingPayload } from "../types";

// Store-wide business rules. These are manager-only on the backend; keeping
// them behind one service stops the Settings screen from knowing transport
// details and gives later consumers one source for the same values.
export const getStoreSettings = (): Promise<SettingResponse[]> =>
  request("/admin/settings", { method: "GET" });

export const updateStoreSetting = (
  key: string,
  body: UpdateSettingPayload
): Promise<SettingResponse> =>
  request(`/admin/settings/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
