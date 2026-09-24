// Placeholder shapes for content that has been asked for but has not arrived.
//
// Used instead of a spinner wherever a whole region is waiting on a fetch. A
// spinner says "something is happening somewhere"; a skeleton says "a table of
// six rows is landing here", which is the more useful sentence and stops the
// layout jumping when it does.
//
// Not for buttons. A button that is saving should say so on the button — the
// row it sits in is not being replaced, and a skeleton there would hide a
// control the user is still looking at.

export function Skeleton({ w = '100%', h = 12, className = '', style }) {
  return <span className={`skeleton block ${className}`} style={{ width: w, height: h, ...style }} />;
}

// Table body placeholder. `cols` takes widths so each column is the shape of
// the data it will hold — a barcode column that shimmers full-width and then
// fills with eight characters is a worse lie than no skeleton at all.
export function SkeletonRows({ rows = 6, cols }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} className="skeleton-row border-b border-app last:border-0">
      {cols.map((w, c) => (
        <td key={c} className="px-4 py-3.5" style={{ '--i': r + c }}>
          <Skeleton w={w} />
        </td>
      ))}
    </tr>
  ));
}

export default Skeleton;
