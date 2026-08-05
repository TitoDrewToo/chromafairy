function SkeletonLine({ short = false }: { short?: boolean }) {
  return <span className={`shop-skeleton-line ${short ? "short" : ""}`} aria-hidden="true" />;
}

function SkeletonCard() {
  return (
    <article className="shop-card shop-skeleton-card" aria-hidden="true">
      <div className="shop-card-image"><div className="shop-skeleton-block" /></div>
      <div className="shop-card-copy">
        <div className="shop-skeleton-meta"><SkeletonLine short /><SkeletonLine short /></div>
        <SkeletonLine />
        <SkeletonLine short />
      </div>
    </article>
  );
}

export default function ShopSkeleton() {
  return (
    <div className="shop-loading" aria-busy="true" aria-label="Loading catalogue">
      <div className="shop-controls">
        <div className="shop-control-group">
          <span className="shop-control-label">View</span>
          <button className="shop-filter active" disabled type="button">Available / New</button>
          <button className="shop-filter active" disabled type="button">Sold / Reserved</button>
        </div>
        <div className="shop-control-group">
          <span className="shop-control-label">Arrange</span>
          <button className="shop-filter active" disabled type="button">Expand all</button>
        </div>
        <span className="shop-result-count">Loading works</span>
      </div>
      <section className="shop-group">
        <div className="shop-skeleton-year"><SkeletonLine /></div>
        <div className="shop-year-content">
          <div className="shop-skeleton-series"><SkeletonLine short /></div>
          <div className="shop-grid">
            {Array.from({ length: 8 }, (_, index) => <SkeletonCard key={index} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
