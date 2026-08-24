"use client";

import { useState } from "react";
import { getArtworkSrcSet, getArtworkTransformUrl } from "../lib/catalogue";

type ShopImageProps = {
  src?: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
};

export default function ShopImage({ src, alt, className = "", loading = "lazy", fetchPriority = "auto", sizes = "(max-width: 760px) 50vw, (max-width: 1100px) 25vw, 300px" }: ShopImageProps) {
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
          fetchPriority={fetchPriority}
          loading={loading}
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          sizes={sizes}
          src={getArtworkTransformUrl(usableSrc, 640)}
          srcSet={getArtworkSrcSet(usableSrc)}
        />
      ) : (
        <div className="shop-placeholder">Chroma Fairy</div>
      )}
    </div>
  );
}
