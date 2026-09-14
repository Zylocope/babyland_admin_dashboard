export const SHOP_TIMEZONE: string;
export function shopToday(instant?: string | number | Date): string;
export function shopDaysAgo(days: number, instant?: string | number | Date): string;
export function formatShopTime(instant: string | number | Date, pattern: string): string;
export function shopDayStart(date: string): Date;
