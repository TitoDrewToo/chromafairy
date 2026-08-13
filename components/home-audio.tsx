"use client";

import { useEffect, useRef, useState } from "react";

const WAVE_TRACKS = [
  { label: "Wave 1", src: "/audio/mixkit-sea-waves-loop-1196.mp3" },
  { label: "Wave 2", src: "/audio/mixkit-distant-sea-humming-ambiance-1191.mp3" },
  { label: "Wave 3", src: "/audio/mixkit-sea-waves-ambience-1189.mp3" },
] as const;
const EFFECT_TRACKS = {
  sparkle: "/audio/mixkit-fairy-magic-sparkle-871.mp3",
  glitter: "/audio/mixkit-fairy-glitter-867.mp3",
  whoosh: "/audio/mixkit-magic-sparkle-whoosh-2350.mp3",
} as const;

type AudioEffectName = keyof typeof EFFECT_TRACKS;

export default function HomeAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const effectRefs = useRef<Record<AudioEffectName, HTMLAudioElement | null>>({ sparkle: null, glitter: null, whoosh: null });
  const enabledRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [waveIndex, setWaveIndex] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const effects = effectRefs.current;

    audio.volume = 0.18;

    const onEffect = (event: Event) => {
      const name = (event as CustomEvent<{ name?: AudioEffectName; volume?: number }>).detail?.name;
      const effect = name ? effects[name] : null;
      if (!enabledRef.current || !effect) return;

      effect.currentTime = 0;
      effect.volume = Math.min(1, Math.max(0, event instanceof CustomEvent && event.detail.volume ? event.detail.volume : 0.12));
      void effect.play().catch(() => {});
    };

    window.addEventListener("cf-audio-effect", onEffect);
    return () => {
      audio.pause();
      audio.currentTime = 0;
      window.removeEventListener("cf-audio-effect", onEffect);
      Object.values(effects).forEach((effect) => effect?.pause());
    };
  }, []);

  const toggleAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (enabled) {
      audio.pause();
      enabledRef.current = false;
      setEnabled(false);
      return;
    }

    try {
      await audio.play();
      enabledRef.current = true;
      setEnabled(true);
    } catch {
      enabledRef.current = false;
      setEnabled(false);
    }
  };

  const cycleWave = async () => {
    const nextIndex = (waveIndex + 1) % WAVE_TRACKS.length;
    const audio = audioRef.current;
    setWaveIndex(nextIndex);
    if (!audio || !enabled) return;

    audio.pause();
    audio.src = WAVE_TRACKS[nextIndex].src;
    audio.load();
    const resume = () => {
      if (enabledRef.current) void audio.play().catch(() => {});
    };
    audio.addEventListener("canplay", resume, { once: true });
    try {
      await audio.play();
    } catch {
      // The new track may still be loading. The canplay listener above
      // resumes it without changing the user's enabled preference.
    }
  };

  return (
    <>
      <audio ref={audioRef} loop preload="metadata" src={WAVE_TRACKS[waveIndex].src} />
      {Object.entries(EFFECT_TRACKS).map(([name, src]) => (
        <audio
          key={name}
          ref={(element) => { effectRefs.current[name as AudioEffectName] = element; }}
          preload="auto"
          src={src}
        />
      ))}
      <div className="home-audio-controls">
        <button
          aria-label={`Switch ambient wave. Currently ${WAVE_TRACKS[waveIndex].label}`}
          className="home-audio-wave"
          onClick={() => void cycleWave()}
          title="Switch ambient wave"
          type="button"
        >
          {WAVE_TRACKS[waveIndex].label} / 3
        </button>
        <button
          aria-pressed={enabled}
          aria-label={enabled ? "Turn ambient sound off" : "Turn ambient sound on"}
          className={`home-audio-toggle${enabled ? " is-on" : ""}`}
          onClick={() => void toggleAudio()}
          type="button"
        >
          <span aria-hidden="true" className="home-audio-glyph">{enabled ? "◖)))" : "◖"}</span>
          <span>{enabled ? "Sound on" : "Sound off"}</span>
        </button>
      </div>
    </>
  );
}
