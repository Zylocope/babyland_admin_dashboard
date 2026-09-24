// Shown while a route chunk is being fetched.
//
// Two rules, both learned the hard way.
//
// It does NOT mock a page shape. One fallback serves every route, so a
// dashboard-shaped placeholder of four tiles and a sheet appeared over the
// login screen, which is a small centred card — it claimed a structure the
// page did not have. A single block says "the page lands here" and is true
// everywhere.
//
// It does NOT appear immediately. Most chunks arrive in well under the delay,
// so on a warm cache nothing is drawn at all and navigation stays silent. The
// placeholder is for a genuinely slow fetch, not for every click.
export default function RouteFallback() {
  return (
    <div className="flex-1 min-h-40 py-1" role="status" aria-live="polite">
      <div className="skeleton route-fallback h-64 w-full" style={{ borderRadius: 14 }} />
    </div>
  );
}
