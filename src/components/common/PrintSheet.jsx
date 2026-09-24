import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Portalled to <body> on purpose. The print stylesheet hides `#root > *`, and a
// sheet rendered inside the page is a descendant of that hidden block — so it
// printed a blank page. As a direct child of body it is the one thing left on.
//
// Mount it with sections to print; it prints two frames later (the browser
// needs the sheet laid out before it can paginate) and then calls onDone(null).
// Pass the state setter itself so onDone is stable across renders.
export default function PrintSheet({ sections, subtitle, onDone }) {
  useEffect(() => {
    if (!sections) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        window.print();
        onDone(null);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [sections, onDone]);

  if (!sections) return null;
  const align = c => ({ textAlign: c.align === 'right' ? 'right' : 'left' });
  return createPortal(
    <div className="print-sheet">
      <header className="print-sheet-head">
        <h1>Appleland</h1>
        <p>{subtitle}</p>
      </header>
      {sections.map(section => (
        <section key={section.key}>
          <h2>{section.name}</h2>
          <table>
            <thead>
              <tr>{section.columns.map(c => <th key={c.key} style={align(c)}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {section.rows.map((row, i) => (
                <tr key={row._key ?? row.id ?? row.date ?? i}>
                  {section.columns.map(c => <td key={c.key} style={align(c)}>{String(c.value(row) ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>,
    document.body,
  );
}
