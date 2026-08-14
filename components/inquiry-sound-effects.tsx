"use client";

import { useEffect, useRef } from "react";

const EFFECT_TRACKS = {
  sparkle: "/audio/mixkit-fairy-magic-sparkle-871.mp3",
  glitter: "/audio/mixkit-fairy-glitter-867.mp3",
  whoosh: "/audio/mixkit-magic-sparkle-whoosh-2350.mp3",
} as const;

type EffectName = keyof typeof EFFECT_TRACKS;

export default function InquirySoundEffects() {
  const effectRefs = useRef<Record<EffectName, HTMLAudioElement | null>>({ sparkle: null, glitter: null, whoosh: null });

  useEffect(() => {
    const onEffect = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: EffectName; volume?: number }>).detail;
      const effect = detail?.name ? effectRefs.current[detail.name] : null;
      if (!effect) return;
      effect.currentTime = 0;
      effect.volume = Math.min(1, Math.max(0, detail.volume ?? 0.1));
      void effect.play().catch(() => {});
    };
    window.addEventListener("cf-audio-effect", onEffect);
    return () => window.removeEventListener("cf-audio-effect", onEffect);
  }, []);

  return <div aria-hidden="true" className="inquiry-sound-effects">{Object.entries(EFFECT_TRACKS).map(([name, src]) => <audio key={name} preload="auto" ref={(element) => { effectRefs.current[name as EffectName] = element; }} src={src} />)}</div>;
}
