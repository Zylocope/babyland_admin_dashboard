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

  let at = 0;
  const arcs = segments.map(s => {
    const len = total ? (s.value / total) * LEN : 0;
    const arc = { len, at, color: s.color };
    at += len;
    return arc;
  });

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
