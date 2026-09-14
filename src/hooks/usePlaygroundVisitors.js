import { useEffect, useState } from 'react';
import { readStore, writeStore, today } from '../utils/playgroundStore';
import { formatShopTime } from '../utils/shopDay';

export const PLAYGROUND_FREE_AT = 10;
export { today };

// Shared by the admin info page and the staff app view. Extracted only because
// there are two real consumers — the alternative was the same 45 lines twice.
//
// ponytail: state is per-consumer, so two views open at once do NOT see each
// other's check-ins live -- they share the same starting data and the last one
// to write wins. That is fine while this is local; when the playground
// endpoints are wired the store moves to the server and both read the same rows.
export function usePlaygroundVisitors() {
  const [visitors, setVisitors] = useState(() => readStore().visitors);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [log, setLog] = useState(() => readStore().log);

  // Persist on every change so a refresh, a locked phone or a dropped tab does
  // not cost the day's check-ins.
  useEffect(() => { writeStore(visitors, log); }, [visitors, log]);

  const reset = () => { setPhone(''); setName(''); setConflict(null); };

  const award = (existing, typedName) => {
    const isFree = existing && existing.points >= PLAYGROUND_FREE_AT;
    let updated;

    if (!existing) {
      updated = { id: `PG${Date.now()}`, phone: phone.trim(), name: typedName, points: 1, visits: 1, lastVisit: today() };
      setVisitors(v => [updated, ...v]);
    } else {
      updated = {
        ...existing,
        points: isFree ? 0 : existing.points + 1,
        visits: existing.visits + 1,
        lastVisit: today(),
      };
      setVisitors(v => v.map(x => (x.id === updated.id ? updated : x)));
    }

    setResult({ kind: isFree ? 'free' : existing ? 'point' : 'new', visitor: updated });
    // Every entry carries its day. Counters below are derived from the log, so
    // truncating it here corrupted them: past eight visits "Check-ins Today"
    // froze at 8 and free visits fell off the end entirely. The list is capped
    // only for storage, and sliced for display at the call site.
    setLog(l => [{ day: today(), at: formatShopTime(Date.now(), 'HH:mm:ss'), name: updated.name, phone: updated.phone, free: isFree }, ...l].slice(0, 500));
    reset();
  };

  const checkIn = (e) => {
    e.preventDefault();
    setResult(null);
    const p = phone.trim();
    const n = name.trim();
    if (!p || !n) return;

    const existing = visitors.find(v => v.phone === p);
    if (existing && existing.name.toLowerCase() !== n.toLowerCase()) {
      setConflict({ visitor: existing, typedName: n });
      return;
    }
    award(existing, n);
  };

  // Filtering by day rather than trusting the stored stamp means a tab left
  // open across the rollover corrects itself on the next check-in, instead of
  // counting yesterday's visits as today's.
  const todaysLog = log.filter(l => l.day === today());
  const freeToday = todaysLog.filter(l => l.free).length;
  const readyForFree = visitors.filter(v => v.points >= PLAYGROUND_FREE_AT).length;
  const totalVisits = visitors.reduce((sum, v) => sum + v.visits, 0);

  return {
    visitors, log: todaysLog, phone, setPhone, name, setName,
    result, conflict, setConflict,
    checkIn, award,
    freeToday, readyForFree, totalVisits,
  };
}
