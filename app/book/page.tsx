import SelfBookingForm from "../../components/self-booking-form";
import { getBookableSlots } from "../../lib/public-booking";
import "../shop/shop.css";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage() {
  const slots = await getBookableSlots();
  return <main className="shop-shell"><div className="shop-frame shop-product"><div className="shop-inquiry-page"><div className="shop-eyebrow">Consultation</div><h1 className="shop-product-title">Find a time to talk</h1><p className="shop-inquiry-intro">Choose an open studio window and send a request. Samantha will confirm the details personally.</p>{slots.length ? <SelfBookingForm slots={slots} /> : <p className="shop-empty">Online booking is not currently available.</p>}</div></div></main>;
}
