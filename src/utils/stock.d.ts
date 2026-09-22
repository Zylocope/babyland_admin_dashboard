export const LOW_STOCK_AT: number;
export function isLowStock(product: { quantity_in_stock?: number | null }): boolean;
export function isOutOfStock(product: { quantity_in_stock?: number | null }): boolean;
export function needsRestock(product: { quantity_in_stock?: number | null }): boolean;
