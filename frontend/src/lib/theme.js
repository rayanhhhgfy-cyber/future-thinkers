import { useEffect } from "react";
import api from "@/lib/api";

/* Site design presets · server stores only the preset key (whitelisted),
   the actual colors live here. Zero CSS injection surface. */
export const THEME_PRESETS = [
  { key: "emerald", name: "الزمردي", a: "#052e26", b: "#065f46", c: "#043a2e", accent: "#10b981" },
  { key: "royal", name: "الملكي الأزرق", a: "#0b1e4b", b: "#1d4ed8", c: "#0a1735", accent: "#3b82f6" },
  { key: "sunset", name: "الغروب", a: "#431407", b: "#c2410c", c: "#3b0a1e", accent: "#fb7185" },
  { key: "violet", name: "البنفسجي", a: "#2e1065", b: "#6d28d9", c: "#1e1033", accent: "#a78bfa" },
  { key: "ocean", name: "المحيط", a: "#082f49", b: "#0369a1", c: "#062033", accent: "#38bdf8" },
  { key: "gold", name: "الذهبي", a: "#451a03", b: "#b45309", c: "#331803", accent: "#f59e0b" },
  { key: "rose", name: "الوردي", a: "#4a0519", b: "#be123c", c: "#33040f", accent: "#fb7185" },
  { key: "crimson", name: "القرمزي", a: "#450a0a", b: "#991b1b", c: "#2b0606", accent: "#f87171" },
];

export function applyTheme(key) {
  const p = THEME_PRESETS.find((t) => t.key === key) || THEME_PRESETS[0];
  const r = document.documentElement.style;
  r.setProperty("--ft-grad-a", p.a);
  r.setProperty("--ft-grad-b", p.b);
  r.setProperty("--ft-grad-c", p.c);
  r.setProperty("--ft-accent", p.accent);
  return p;
}

export function ThemeApplier() {
  useEffect(() => {
    const cached = localStorage.getItem("ft-theme");
    if (cached) applyTheme(cached);
    api.get("/theme").then((r) => {
      const key = r.data?.preset;
      if (key) { localStorage.setItem("ft-theme", key); applyTheme(key); }
    }).catch(() => {});
  }, []);
  return null;
}
