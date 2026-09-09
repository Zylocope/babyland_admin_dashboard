// Semicircle gauge. The segments are dash offsets along ONE arc rather than
// separate stacked arcs, so their ends always meet exactly.
//
// Empty segments are dropped rather than drawn at zero length: a zero-length
// dash still paints its round linecap, which showed as a stray dot at the start
// of the arc whenever a segment was at zero.
export default function Gauge({ segments, width = 200, className = '' }) {
  const R = 68;
  const LEN = Math.PI * R;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // Offsets are derived rather than accumulated in a mutable local: reassigning
  // during render is what react-hooks/immutability flags, and n is 2-3 here so
  // the repeated scan costs nothing.
  const lenOf = (s) => (total ? (s.value / total) * LEN : 0);
  const arcs = segments.map((s, i) => ({
    len: lenOf(s),
    at: segments.slice(0, i).reduce((sum, prev) => sum + lenOf(prev), 0),
    color: s.color,
  }));

  return (
    <svg viewBox="0 0 180 104" style={{ width }} className={className}>
      <path d="M 22 92 A 68 68 0 0 1 158 92" fill="none" stroke="var(--border)"
        strokeWidth="17" strokeLinecap="round" />
      {arcs.filter(a => a.len > 0.5).map((a, i) => (
        <path key={i} d="M 22 92 A 68 68 0 0 1 158 92" fill="none" stroke={a.color}
          strokeWidth="17" strokeLinecap="round"
          strokeDasharray={`${a.len} ${LEN}`} strokeDashoffset={-a.at} />
      ))}
    </svg>
  );
}
