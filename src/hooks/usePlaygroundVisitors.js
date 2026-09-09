import { useState } from 'react';

export const PLAYGROUND_FREE_AT = 10;
export const today = () => new Date().toISOString().slice(0, 10);

// Shared by the admin info page and the staff app view. Extracted only because
// there are two real consumers — the alternative was the same 45 lines twice.
//
// ponytail: state is per-consumer, so the two views do NOT see each other's
// check-ins. That is fine while this is mock/local; when the playground
// endpoints are wired the store moves to the server and both read the same rows.
export function usePlaygroundVisitors() {
  const [visitors, setVisitors] = useState([]);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [log, setLog] = useState([]);

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
    setLog(l => [{ at: new Date().toLocaleTimeString(), name: updated.name, phone: updated.phone, free: isFree }, ...l].slice(0, 8));
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

  const freeToday = log.filter(l => l.free).length;
  const readyForFree = visitors.filter(v => v.points >= PLAYGROUND_FREE_AT).length;
  const totalVisits = visitors.reduce((sum, v) => sum + v.visits, 0);

  return {
    visitors, log, phone, setPhone, name, setName,
    result, conflict, setConflict,
    checkIn, award,
    freeToday, readyForFree, totalVisits,
  };
}
