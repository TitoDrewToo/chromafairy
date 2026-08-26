import { getArtworkSrcSet, getArtworkTransformUrl } from "../lib/catalogue";

export type HomeShopPreviewItem = {
  title: string;
  imageUrl: string;
  alt: string;
};

export default function HomeShopPreview({ items }: { items: HomeShopPreviewItem[] }) {
  if (!items.length) return null;

  const renderGroup = (hidden = false) => (
    <div className="commission-shop-preview-group" aria-hidden={hidden}>
      {items.map((item) => (
        <div className="commission-shop-preview-card" key={`${hidden ? "duplicate-" : ""}${item.title}-${item.imageUrl}`}>
          <img
            alt={hidden ? "" : item.alt}
            decoding="async"
            loading="lazy"
            src={getArtworkTransformUrl(item.imageUrl, 640)}
            srcSet={getArtworkSrcSet(item.imageUrl)}
          />
          {!hidden && <span>{item.title}</span>}
        </div>
      ))}
    </div>
  );

  return <div className="commission-shop-preview" aria-label="Recent works from the shop"><div className="commission-shop-preview-track">{renderGroup()}{renderGroup(true)}</div></div>;
}
