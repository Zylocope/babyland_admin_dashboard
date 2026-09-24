// Legend as a row of dots and labels rather than recharts' default swatches.
//
// Two rules it exists to keep:
//   • Text wears text tokens, never the series colour. The dot beside the label
//     carries identity; the word itself stays in muted ink so it is readable at
//     any contrast.
//   • A legend is always present for two or more series, because colour is then
//     never the sole carrier of identity — which is what lets a palette pass
//     with a pair sitting near the colourblind floor.
//
// Pass to recharts as <Legend content={<ChartLegend />} verticalAlign="top"
// align="right" />; recharts supplies `payload`.
export default function ChartLegend({ payload = [] }) {
  if (!payload.length) return null;
  return (
    <ul className="flex flex-wrap justify-end gap-x-4 gap-y-1.5 pb-3 list-none m-0 p-0">
      {payload.map(entry => (
        <li key={entry.value} className="inline-flex items-center gap-1.5 text-[11px] text-sub">
          {/* A line series gets a bar, a filled series gets a dot — so the mark
              in the legend matches the mark on the plot. */}
          <span
            aria-hidden="true"
            className={entry.type === 'line' ? 'w-3 h-[2px] rounded-full' : 'w-2.5 h-2.5 rounded-full'}
            style={{ background: entry.color }}
          />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}
