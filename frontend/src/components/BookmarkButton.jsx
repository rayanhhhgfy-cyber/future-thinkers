import React, { useEffect, useReducer, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck } from "lucide-react";

/* Shared bookmark cache: one GET /api/bookmarks per page-load, all buttons stay in sync. */
let cache = null; // Map<"kind:refId", bookmark>
let version = 0;
const listeners = new Set();
const emit = () => { version++; listeners.forEach((l) => l()); };
const key = (kind, refId) => `${kind}:${refId}`;

async function loadCache() {
  if (cache) return cache;
  try {
    const { data } = await api.get("/bookmarks");
    cache = new Map((data.items || []).map((b) => [key(b.kind, b.ref_id), b]));
  } catch {
    cache = new Map();
  }
  emit();
  return cache;
}

export function useBookmarks() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    loadCache();
    listeners.add(force);
    return () => listeners.delete(force);
  }, []);
  const toggle = useCallback(async (kind, refId, title) => {
    await loadCache();
    const k = key(kind, refId);
    try {
      if (cache.has(k)) {
        const b = cache.get(k);
        await api.delete(`/bookmarks/${b.id}`);
        cache.delete(k);
        toast.success("أُزيل من المحفوظات");
      } else {
        const { data } = await api.post("/bookmarks", { kind, ref_id: refId, title });
        cache.set(k, data);
        toast.success("حُفظ في عناصرِك المحفوظة 📌");
      }
      emit();
      return true;
    } catch {
      toast.error("تعذّر الحفظ");
      return false;
    }
  }, []);
  const removeById = useCallback(async (bid, k) => {
    try {
      await api.delete(`/bookmarks/${bid}`);
      if (k && cache) cache.delete(k);
      emit();
      return true;
    } catch {
      toast.error("تعذّر الحذف");
      return false;
    }
  }, []);
  return { map: cache || new Map(), toggle, removeById, loaded: !!cache, refresh: loadCache };
}

/**
 * Small bookmark toggle. Safe to drop inside cards · call e.stopPropagation
 * yourself when the parent is a link/button.
 */
export default function BookmarkButton({ kind, refId, title, className = "", iconClass = "w-4 h-4", dark = false }) {
  const { user } = useAuth();
  const { map, toggle } = useBookmarks();
  const saved = map.has(key(kind, refId));
  if (!user) return null;
  const base = saved
    ? "bg-amber-400/90 text-white"
    : dark
      ? "bg-white/15 text-white/85 hover:text-amber-300 hover:bg-white/25"
      : "bg-white/80 text-slate-500 hover:text-amber-500";
  return (
    <button
      type="button"
      aria-label={saved ? "إزالة من المحفوظات" : "حفظ"}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggle(kind, refId, title); }}
      className={`rounded-full p-2 backdrop-blur transition-all pressable ${base} ${className}`}
    >
      {saved ? <BookmarkCheck className={iconClass} /> : <Bookmark className={iconClass} />}
    </button>
  );
}
