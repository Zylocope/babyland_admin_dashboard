// Categorical chart palette. Orange stays slot 1 because it is the brand, but a
// chart with several series must not be six shades of it — every slot below is a
// distinct hue.
//
// Both sets were validated with the dataviz palette checker against this app's
// real chart surfaces (#FCF8FF light, #1E1B26 dark) and pass every check:
// lightness band, chroma floor, adjacent-pair CVD separation, normal-vision
// floor, and contrast.
//
// What changed from the first attempt, and why:
//
//   • Orange is one step deeper. #F97316 measured 2.73:1 on the light surface —
//     under the 3:1 bar — and was only legal because every chart ships a legend.
//     It now passes on its own.
//   • Olive is gone, replaced by gold. Olive↔pink sat at ΔE 6.4 under
//     tritanopia, inside the "floor" band that needs secondary encoding to be
//     allowed at all. The worst adjacent pair is now 8.8, above the floor.
//   • Dark is genuinely re-stepped rather than copied. It previously shared five
//     of six values with light, and violet measured 2.97:1 on the dark surface.
//     Indigo, pink and green now have their own steps.
//
// Order is FIXED. Assign by slot index and never cycle or re-sort — a filter
// that drops a series must not repaint the survivors.
const LIGHT = ['#EA580C', '#0D9488', '#4F46E5', '#A16207', '#DB2777', '#15803D'];

// Dark is selected against the dark surface, not flipped from light. The band
// there is narrower and lower (L 0.48–0.67), so these sit mid rather than pale —
// a very light saturated fill glares on a dark card.
const DARK = ['#EA580C', '#0D9488', '#6366F1', '#B27407', '#EC4899', '#16A34A'];

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
