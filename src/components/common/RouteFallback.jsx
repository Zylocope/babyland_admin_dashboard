import { IconLoader2 } from '@tabler/icons-react';

// Shown while a route chunk is being fetched.
//
// Deliberately quiet: on a warm cache this appears for a frame or two, and a
// skeleton or a big spinner flashing on every navigation is more distracting
// than a small one. It fills the space rather than collapsing the layout, so the
// shell does not jump while the page arrives.
export default function RouteFallback() {
  return (
    <div className="flex-1 min-h-40 flex items-center justify-center py-16" role="status" aria-live="polite">
      <IconLoader2 size={22} stroke={1.8} className="animate-spin text-mute motion-reduce:animate-none" />
    </div>
  );
}
