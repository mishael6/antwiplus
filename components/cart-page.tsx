"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/components/cart";

export function CartPage() {
  const { lines, ready, subtotal, setQuantity, remove } = useCart();
  if (!ready) return <div className="store-empty"><p>Loading your cart…</p></div>;
  if (!lines.length) return <div className="store-empty"><span>♡</span><h1>Your cart is empty.</h1><p>Take a look around and add something you love.</p><Link className="store-primary-button" href="/shop">Explore the shop <span>↗</span></Link></div>;
  return <div className="cart-layout"><section className="cart-lines" aria-label="Items in your cart">{lines.map(({ product, quantity }) => <article className="cart-line" key={product.id}>
    <div className="cart-line-image" style={product.image_url ? { backgroundImage: `url("${product.image_url}")` } : undefined}>{!product.image_url && <span>◒</span>}</div>
    <div className="cart-line-details"><span className="product-category">{product.category}</span><Link href={`/products/${product.slug}`}><h2>{product.name}</h2></Link><button className="store-text-button" type="button" onClick={() => remove(product.id)}>Remove</button></div>
    <div className="cart-line-controls"><label>Qty <select value={quantity} onChange={(event) => setQuantity(product.id, Number(event.target.value))}>{Array.from({ length: Math.max(1, Math.min(product.stock_quantity, 20)) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><b>{formatPrice(product.price_pesewas * quantity)}</b></div>
  </article>)}</section>
  <aside className="cart-summary"><p className="admin-kicker">YOUR ORDER</p><h2>Order summary</h2><div><span>Subtotal</span><b>{formatPrice(subtotal)}</b></div><div><span>Delivery</span><span>Calculated at checkout</span></div><p className="cart-delivery-note">We’ll confirm your delivery fee with you before dispatch.</p><Link className="store-primary-button full-button" href="/checkout">Continue to checkout <span>↗</span></Link><Link className="store-back-link" href="/shop">Continue shopping</Link></aside></div>;
}
