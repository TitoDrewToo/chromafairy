"use client";

import type { CSSProperties } from "react";

type AnimatedFairyProps = {
  size?: number;
  intensity?: number;
  className?: string;
};

export default function AnimatedFairy({ size = 108, intensity = 0.72, className = "" }: AnimatedFairyProps) {
  const style = {
    "--fairy-size": `${size}px`,
    "--fairy-intensity": intensity,
  } as CSSProperties;

  return (
    <div aria-label="Chroma Fairy" className={`animated-fairy ${className}`} role="img" style={style}>
      <div className="animated-fairy-art">
        <img alt="" src="/fairy-logo-option-v2.png" />
        <span aria-hidden="true" className="animated-fairy-shimmer" />
      </div>
    </div>
  );
}
