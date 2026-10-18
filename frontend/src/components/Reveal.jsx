import React, { useEffect, useRef, useState } from "react";

/**
 * useReveal — IntersectionObserver-based scroll reveal (CSS-only animation).
 * Returns [ref, visible]. Once visible, stays visible (no re-hiding on scroll).
 * Safe fallbacks: no IntersectionObserver support or prefers-reduced-motion
 * → visible immediately so content is never stuck invisible.
 */
export function useReveal({ threshold = 0.12, rootMargin = "0px 0px -48px 0px" } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setVisible(true);
        return undefined;
      }
    } catch {
      /* matchMedia unavailable — fall through to observer */
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, visible];
}

/**
 * <Reveal> — CSS-only drop-in replacement for the framer-motion FadeUp.
 * Fades + rises into view once via the `.reveal` / `.is-visible` classes.
 *
 * Props (API-compatible with the old FadeUp):
 *   className, delay (seconds → converted to --i stagger index), index (--i directly),
 *   as (element tag, default "div"). `y` accepted and ignored (distance is fixed in CSS).
 * All other props (e.g. data-testid) are spread onto the element.
 */
export function Reveal({ children, className = "", delay, index, as: Tag = "div", y, ...rest }) {
  const [ref, visible] = useReveal();
  const i = index ?? (delay != null ? Math.max(0, Math.round(delay / 0.06)) : undefined);

  return (
    <Tag
      ref={ref}
      {...rest}
      className={`reveal${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={i != null ? { "--i": i } : undefined}
    >
      {children}
    </Tag>
  );
}
