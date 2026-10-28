"use client";

import Link from "next/link";
import { useCart } from "@/components/cart";
import { formatPrice } from "@/lib/currency";
import { placeCashOrder } from "@/app/checkout/actions";

export function CheckoutForm({ error }: { error?: string }) {
  const { lines, ready, subtotal } = useCart();
  if (!ready) return <div className="store-empty"><p>Loading your bag…</p></div>;
  if (!lines.length) return <div className="store-empty"><h1>Your bag is empty.</h1><p>Add a product before checking out.</p><Link className="store-primary-button" href="/shop">Browse the shop <span>↗</span></Link></div>;
  const message = error === "stock" ? "One or more items are no longer available in that quantity. Please update your bag." : error === "details" || error === "cart" ? "Please check your details and try again." : error === "setup" ? "The store connection is not configured yet." : error ? "We couldn’t save your order. Please try again." : "";
  return <div className="checkout-layout"><form action={placeCashOrder} className="checkout-form">
    {message && <p className="checkout-error" role="alert">{message}</p>}
    <section className="checkout-section"><p className="admin-kicker">01 / CONTACT</p><h2>How can we reach you?</h2><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" required placeholder="e.g. 024 000 0000" /></label></section>
    <section className="checkout-section"><p className="admin-kicker">02 / DELIVERY</p><h2>Where should we send it?</h2><label>Full name<input name="full_name" autoComplete="name" required /></label><label>Street address<textarea name="address" rows={3} autoComplete="street-address" required placeholder="House number, street, landmark" /></label><div className="checkout-fields"><label>City or town<input name="city" autoComplete="address-level2" required /></label><label>Region<select name="region" autoComplete="address-level1" defaultValue="" required><option value="" disabled>Select region</option>{["Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra", "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West", "Volta", "Western", "Western North"].map((region) => <option key={region}>{region}</option>)}</select></label></div></section>
    <input type="hidden" name="items" value={JSON.stringify(lines.map(({ product, quantity }) => ({ product_id: product.id, quantity })))} />
    <button className="store-primary-button full-button" type="submit">Place cash-on-delivery order <span>↗</span></button>
    <p className="checkout-disclaimer">No online payment is collected yet. We’ll contact you to confirm delivery and payment details.</p>
  </form><aside className="cart-summary checkout-summary"><p className="admin-kicker">YOUR ORDER</p><h2>Order summary</h2>{lines.map(({ product, quantity }) => <div className="checkout-summary-line" key={product.id}><span>{product.name} <small>× {quantity}</small></span><b>{formatPrice(product.price_pesewas * quantity)}</b></div>)}<div className="checkout-total"><b>Subtotal</b><b>{formatPrice(subtotal)}</b></div><p className="cart-delivery-note">Delivery cost will be confirmed before dispatch.</p><Link className="store-back-link" href="/cart">← Back to bag</Link></aside></div>;
}
