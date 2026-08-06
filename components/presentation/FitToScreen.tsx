"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MIN_SCALE = 0.45;
const MAX_SCALE = 1.6;

export function FitToScreen({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function recompute() {
      if (!outer || !inner) return;
      const scaleH = outer.clientHeight / inner.scrollHeight;
      const scaleW = outer.clientWidth / inner.scrollWidth;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(scaleH, scaleW)));
      setScale(next);
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(inner);
    ro.observe(outer);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [children]);

  return (
    <div ref={outerRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div ref={innerRef} className="presentation-fit" style={{ transform: `scale(${scale})`, transformOrigin: "center center", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
