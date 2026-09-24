import Skeleton from './Skeleton';

// Shown while a route chunk is being fetched.
//
// A page-shaped placeholder rather than a spinner: it reserves the space the
// page is about to take, so the shell does not jump when it arrives, and it
// reads as "the page is coming" instead of "something is happening somewhere".
//
// Deliberately generic — this stands in for every route, so it cannot mirror
// any one of them. A header strip, a row of tiles and a sheet is the shape most
// of them share. On a warm cache it is gone in a frame or two.
export default function RouteFallback() {
  return (
    <div className="flex-1 space-y-6 py-1" role="status" aria-live="polite">
      <Skeleton w={180} h={20} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 skeleton-row">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="surface-card is-sheet p-5 space-y-3" style={{ '--i': i }}>
            <Skeleton w="55%" h={11} />
            <Skeleton w="70%" h={22} />
          </div>
        ))}
      </div>

      <div className="surface-card is-sheet p-6 space-y-3 skeleton-row">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} w={`${92 - i * 7}%`} h={14} style={{ '--i': i }} />
        ))}
      </div>
    </div>
  );
}
