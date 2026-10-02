import { useEffect } from "react";
import api from "@/lib/api";

/* Site design control · the server stores only a whitelisted preset key,
   optional custom colors (validated #RRGGBB on the server), and boolean
   effects. The actual color values live here. Zero CSS injection surface. */
export const THEME_PRESETS = [
  { key: "emerald", name: "الزمردي", a: "#052e26", b: "#065f46", c: "#043a2e", accent: "#10b981" },
  { key: "royal", name: "الملكي الأزرق", a: "#0b1e4b", b: "#1d4ed8", c: "#0a1735", accent: "#3b82f6" },
  { key: "sunset", name: "الغروب", a: "#431407", b: "#c2410c", c: "#3b0a1e", accent: "#fb7185" },
  { key: "violet", name: "البنفسجي", a: "#2e1065", b: "#6d28d9", c: "#1e1033", accent: "#a78bfa" },
  { key: "ocean", name: "المحيط", a: "#082f49", b: "#0369a1", c: "#062033", accent: "#38bdf8" },
  { key: "gold", name: "الذهبي", a: "#451a03", b: "#b45309", c: "#331803", accent: "#f59e0b" },
  { key: "rose", name: "الوردي", a: "#4a0519", b: "#be123c", c: "#33040f", accent: "#fb7185" },
  { key: "crimson", name: "القرمزي", a: "#450a0a", b: "#991b1b", c: "#2b0606", accent: "#f87171" },
  { key: "midnight", name: "الليل", a: "#0a1128", b: "#273469", c: "#050814", accent: "#818cf8" },
  { key: "forest", name: "الغابة", a: "#052e16", b: "#166534", c: "#02180c", accent: "#4ade80" },
  { key: "desert", name: "الصحراء", a: "#3f3005", b: "#a16207", c: "#2a1e03", accent: "#facc15" },
  { key: "lavender", name: "اللافندر", a: "#2a0a4a", b: "#9333ea", c: "#1a0430", accent: "#c084fc" },
];

const DEFAULT_EFFECTS = { grain: true, motion: true };
const HEX = /^#[0-9a-fA-F]{6}$/;

function normalizeConfig(config) {
  const cfg = config || {};
  const preset = THEME_PRESETS.some((t) => t.key === cfg.preset) ? cfg.preset : "emerald";
  const custom = cfg.custom && typeof cfg.custom === "object" ? cfg.custom : null;
  const effects = {
    grain: !cfg.effects || cfg.effects.grain !== false,
    motion: !cfg.effects || cfg.effects.motion !== false,
  };
  return { preset, custom, effects };
}

/* Effective colors: preset values, overridden per-field by valid custom colors. */
export function resolveColors(config) {
  const { preset, custom } = normalizeConfig(config);
  const base = THEME_PRESETS.find((t) => t.key === preset) || THEME_PRESETS[0];
  if (!custom) return { a: base.a, b: base.b, c: base.c, accent: base.accent };
  const pick = (v, fallback) => (HEX.test(v || "") ? v : fallback);
  return {
    a: pick(custom.a, base.a),
    b: pick(custom.b, base.b),
    c: pick(custom.c, base.c),
    accent: pick(custom.accent, base.accent),
  };
}

/* Apply a full design config: CSS vars + effect flags + local cache. */
export function applyDesign(config) {
  const cfg = normalizeConfig(config);
  const colors = resolveColors(cfg);
  const r = document.documentElement.style;
  r.setProperty("--ft-grad-a", colors.a);
  r.setProperty("--ft-grad-b", colors.b);
  r.setProperty("--ft-grad-c", colors.c);
  r.setProperty("--ft-accent", colors.accent);
  document.documentElement.dataset.grain = cfg.effects.grain ? "on" : "off";
  document.documentElement.dataset.motion = cfg.effects.motion ? "on" : "off";
  try {
    localStorage.setItem("ft-design", JSON.stringify(cfg));
    localStorage.setItem("ft-theme", cfg.preset);
  } catch { /* private mode */ }
  return cfg;
}

/* Back-compat: Admin.jsx imports applyTheme. Applies a preset (custom colors
   cleared) while keeping the currently cached effect toggles. */
export function applyTheme(key) {
  let effects = { ...DEFAULT_EFFECTS };
  try {
    const cached = JSON.parse(localStorage.getItem("ft-design") || "null");
    if (cached && cached.effects) {
      effects = {
        grain: cached.effects.grain !== false,
        motion: cached.effects.motion !== false,
      };
    }
  } catch { /* ignore */ }
  return applyDesign({ preset: key, custom: null, effects });
}

export function ThemeApplier() {
  useEffect(() => {
    let applied = false;
    try {
      const cached = localStorage.getItem("ft-design");
      if (cached) { applyDesign(JSON.parse(cached)); applied = true; }
    } catch { /* ignore */ }
    if (!applied) {
      const legacy = localStorage.getItem("ft-theme");
      if (legacy) applyTheme(legacy);
    }
    api.get("/theme").then((r) => {
      if (r.data) applyDesign(r.data);
    }).catch(() => {});
  }, []);
  return null;
}
