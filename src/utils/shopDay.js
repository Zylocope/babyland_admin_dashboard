// The shop's calendar day, in one place.
//
// Myanmar is UTC+06:30 with no DST. `toISOString()` is UTC, so a naive
// implementation rolls the business day over at 06:30 local time and counts an
// early-morning sale as yesterday. Shifting by the offset also makes the answer
// independent of how the device clock is configured, which matters because the
// same day has to mean the same thing on a till, a manager's laptop and a phone
// at the playground door.
const MM_OFFSET_MIN = 6 * 60 + 30;

export const shopToday = () =>
  new Date(Date.now() + MM_OFFSET_MIN * 60_000).toISOString().slice(0, 10);

// N days back from the shop's today, on the same calendar. Date arithmetic done
// with the device clock drifts across the 06:30 boundary exactly like the day
// itself does, so every range in the app is built from these two.
export const shopDaysAgo = (n) =>
  new Date(Date.now() + MM_OFFSET_MIN * 60_000 - n * 86_400_000).toISOString().slice(0, 10);
