// Demo mode: an explicit switch, never a fallback.
//
// This app has twice shipped a bug where fake numbers stood in for real ones
// and nobody could tell — the header rendered "82K MMK" from a mock on every
// page, and Staff looked like it had accounts. The rule that prevents a third
// time is that mock data is only ever served when someone deliberately asked
// for it. It must never appear because a request failed or came back empty.
//
// On means: the sales endpoints return generated data, and a banner says so on
// every screen for as long as it lasts.
import { useSyncExternalStore } from 'react';

const KEY = 'appleland:demo';

// A URL flag makes a demo link shareable; it writes through to storage so a
// reload inside the session keeps it. ?demo=0 turns it back off.
const fromUrl = () => {
  try {
    const v = new URLSearchParams(window.location.search).get('demo');
    return v === null ? null : v !== '0' && v !== 'false';
  } catch { return null; }
};

const read = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

let active = (() => {
  const url = fromUrl();
  if (url === null) return read();
  try { localStorage.setItem(KEY, url ? '1' : '0'); } catch { /* private mode */ }
  return url;
})();

const listeners = new Set();

export const isDemoMode = () => active;

export const setDemoMode = (on) => {
  active = Boolean(on);
  try { localStorage.setItem(KEY, active ? '1' : '0'); } catch { /* private mode */ }
  listeners.forEach(fn => fn(active));
};

// Plain subscribe rather than a context: the flag is read inside the service
// layer, which has no React above it.
export const subscribeDemoMode = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useDemoMode = () =>
  useSyncExternalStore(subscribeDemoMode, isDemoMode, () => false);
