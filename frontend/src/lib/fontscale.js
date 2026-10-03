/* Personal font scale · scales the whole app by changing the root font size.
   Tailwind spacing and type are rem-based, so the UI grows/shrinks uniformly.
   The chosen step lives in localStorage and is applied via the
   html[data-fontscale] CSS rules in index.css (which sit after the density
   rules, so a personal choice wins over the theme density when set). */

export const FONT_SCALE_STEPS = [
  { key: "s", label: "صغير", glyph: "A", glyphCls: "text-sm" },
  { key: "m", label: "قياسي", glyph: "A", glyphCls: "text-lg" },
  { key: "l", label: "كبير", glyph: "A", glyphCls: "text-2xl" },
  { key: "xl", label: "أكبر", glyph: "A", glyphCls: "text-3xl" },
];

const KEY = "ft-font-scale";

export function getFontScale() {
  try {
    const v = localStorage.getItem(KEY);
    return FONT_SCALE_STEPS.some((s) => s.key === v) ? v : "m";
  } catch {
    return "m";
  }
}

export function applyFontScale(key) {
  const k = FONT_SCALE_STEPS.some((s) => s.key === key) ? key : "m";
  try { localStorage.setItem(KEY, k); } catch { /* private mode · applies for this session only */ }
  const root = document.documentElement;
  if (k === "m") delete root.dataset.fontscale;
  else root.dataset.fontscale = k;
  return k;
}

/* Call once before first render so a saved scale never flashes at default size. */
export function initFontScale() {
  const k = getFontScale();
  if (k !== "m") document.documentElement.dataset.fontscale = k;
}
