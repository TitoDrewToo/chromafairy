import Link from "next/link";
import "../shop/shop.css";

export default function InquirePage() {
  return (
    <main className="shop-shell">
      <div className="shop-frame shop-product">
        <Link className="shop-back shop-product-back" href="/shop">← Back to catalogue</Link>
        <div className="shop-empty">
          Inquiries open in the next chapter.
          <div><Link className="shop-link" href="/">Return home</Link></div>
        </div>
      </div>
    </main>
  );
}
