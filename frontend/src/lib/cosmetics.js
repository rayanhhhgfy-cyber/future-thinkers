/* Shared cosmetic presets: profile cover gradients + avatar frame rings. */
export const COVERS = [
  { key: "navy", name: "كحلي ليلي", cls: "from-[#0A192F] via-[#0d2242] to-emerald-900" },
  { key: "emerald", name: "زمردي", cls: "from-emerald-600 via-emerald-800 to-teal-950" },
  { key: "sunset", name: "غروب", cls: "from-orange-500 via-rose-500 to-purple-700" },
  { key: "galaxy", name: "مجرّة", cls: "from-violet-600 via-purple-800 to-slate-950" },
  { key: "ocean", name: "محيط", cls: "from-sky-500 via-blue-700 to-indigo-950" },
  { key: "gold", name: "ذهبي", cls: "from-amber-500 via-yellow-600 to-amber-900" },
  { key: "rose", name: "وردي", cls: "from-rose-500 via-pink-600 to-fuchsia-900" },
  { key: "forest", name: "غابة", cls: "from-green-600 via-emerald-800 to-green-950" },
];

export function coverCls(key) {
  return (COVERS.find((c) => c.key === key) || COVERS[0]).cls;
}

export const FRAME_RING = {
  frame_emerald: "ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,.45)]",
  frame_gold: "ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,.5)]",
  frame_galaxy: "ring-violet-500 shadow-[0_0_24px_rgba(139,92,246,.55)]",
};
