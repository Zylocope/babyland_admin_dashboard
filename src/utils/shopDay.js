// The shop's calendar day, in one place.
//
// Myanmar is UTC+06:30 with no DST. `toISOString()` is UTC, so a naive
// implementation rolls the business day over at 06:30 local time and counts an
// early-morning sale as yesterday. Explicit Asia/Yangon conversion makes the answer
// independent of the device timezone, which matters because the
// same day has to mean the same thing on a till, a manager's laptop and a phone
// at the playground door.
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);
export const SHOP_TIMEZONE = 'Asia/Yangon';

export const shopToday = (instant = Date.now()) =>
  dayjs(instant).tz(SHOP_TIMEZONE).format('YYYY-MM-DD');

// N days back from the shop's today, on the same calendar. Date arithmetic done
// with the device clock drifts across the 06:30 boundary exactly like the day
// itself does, so every range in the app is built from these two.
export const shopDaysAgo = (n, instant = Date.now()) =>
  dayjs(instant).tz(SHOP_TIMEZONE).subtract(n, 'day').format('YYYY-MM-DD');

export const formatShopTime = (instant, pattern) =>
  dayjs(instant).tz(SHOP_TIMEZONE).format(pattern);

export const shopDayStart = (date) => dayjs.tz(date, SHOP_TIMEZONE).toDate();
