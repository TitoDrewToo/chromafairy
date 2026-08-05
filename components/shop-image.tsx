"use client";

import { useState } from "react";

type ShopImageProps = {
  src?: string;
  alt: string;
  className?: string;
};

export default function ShopImage({ src, alt, className = "" }: ShopImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const usableSrc = src && !failed ? src : undefined;

  return (
    <div className={`shop-image ${loaded ? "is-loaded" : ""} ${usableSrc ? "" : "no-image"} ${className}`}>
      <div className="shop-image-shimmer" aria-hidden="true" />
      {usableSrc ? (
        <img
          alt={alt}
          decoding="async"
          loading="lazy"
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          src={usableSrc}
        />
      ) : (
        <div className="shop-placeholder">Chroma Fairy</div>
      )}
    </div>
  );
}
