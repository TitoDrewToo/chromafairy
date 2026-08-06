"use client";

import { useLayoutEffect, useRef, useState } from "react";

export default function DailyVerseFit({ reference, text, attribution }: { reference: string; text: string; attribution: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(2.6);

  useLayoutEffect(() => {
    const fit = () => {
      const frame = frameRef.current;
      const verseText = textRef.current;
      if (!frame || !verseText) return;
      const computed = window.getComputedStyle(frame);
      const availableHeight = frame.clientHeight - parseFloat(computed.paddingTop) - parseFloat(computed.paddingBottom);
      let low = 1;
      let high = 2.6;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const middle = (low + high) / 2;
        verseText.style.fontSize = `${middle}rem`;
        if (verseText.scrollHeight <= availableHeight && verseText.scrollWidth <= frame.clientWidth) low = middle;
        else high = middle;
      }
      setFontSize(Math.max(1, Math.min(2.6, low)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (frameRef.current) observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [text]);

  return (
    <section className="daily-verse" aria-label="Daily verse">
      <div className="daily-verse-frame" ref={frameRef}>
        <p className="daily-verse-text" ref={textRef} style={{ fontSize: `${fontSize}rem` }}>“{text}”</p>
      </div>
      <p className="daily-verse-reference">{reference}</p>
      <p className="daily-verse-attribution">{attribution}</p>
    </section>
  );
}
