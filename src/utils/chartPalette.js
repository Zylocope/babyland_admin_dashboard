// Categorical chart palette. Orange stays slot 1 because it is the brand, but a
// chart with several series must not be six shades of it — every slot below is a
// distinct hue.
//
// Validated with the dataviz palette checker against both surfaces:
// lightness band, chroma floor, colourblind separation (protan/deutan/tritan),
// normal-vision floor, and contrast. Two results worth keeping in mind:
//
//   • Brand orange is 2.73:1 on the light surface — under the 3:1 bar. That is
//     allowed only because every chart here ships a legend and axis labels, so
//     colour is never the sole carrier of identity. Don't drop those.
//   • Pink↔olive sits at ΔE 6.4 under tritanopia, inside the "floor" band. Same
//     relief applies: they are only ever adjacent with labels present.
//
// Order is FIXED. Assign by slot index and never cycle or re-sort — a filter
// that drops a series must not repaint the survivors.
const LIGHT = ['#F97316', '#2563EB', '#0D9488', '#7C3AED', '#DB2777', '#65A30D'];

// Dark keeps the same hues; only the orange steps down, because #F97316 sits
// above the dark lightness band. These are chosen steps, not an auto-flip.
const DARK = ['#E8690F', '#2563EB', '#0D9488', '#7C3AED', '#DB2777', '#65A30D'];

export const chartColors = (dark) => (dark ? DARK : LIGHT);

// One series, one hue — for magnitude over an ordered dimension (days, months),
// where colouring each bar differently would encode rank instead of identity.
export const seriesColor = (dark) => (dark ? DARK[0] : LIGHT[0]);

// Muted step for the "before" side of a comparison, so the current period reads
// as the subject and the previous one as reference.
export const referenceColor = (dark) => (dark ? '#4B5563' : '#94A3B8');

// Reserved. Status is never reused as a categorical slot, and always ships with
// a label or icon rather than colour alone.
export const STATUS = {
  good: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
};

export const colorAt = (index, dark) => {
  const list = chartColors(dark);
  return list[index % list.length];
};
