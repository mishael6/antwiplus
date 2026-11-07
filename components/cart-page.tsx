"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/components/cart";

export function CartPage() {
  const { lines, ready, subtotal, setQuantity, remove, changeVariant } = useCart();
  if (!ready) return <div className="store-empty"><p>Loading your cart…</p></div>;
  if (!lines.length) return <div className="store-empty"><span>♡</span><h1>Your cart is empty.</h1><p>Take a look around and add something you love.</p><Link className="store-primary-button" href="/shop">Explore the shop <span>↗</span></Link></div>;
  return <div className="cart-layout"><section className="cart-lines" aria-label="Items in your cart"><div className="cart-lines-heading"><b>Your items</b><span>{lines.length} {lines.length === 1 ? "item" : "items"}</span></div>{lines.map(({ product, quantity }) => <article className="cart-line" key={product.cart_key ?? product.id}>
    <div className="cart-line-image">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>◒</span>}</div>
    <div className="cart-line-details"><span className="product-category">{product.category}</span><Link href={`/products/${product.slug}`}><h2>{product.name}</h2></Link>{product.variants?.length ? <label className="cart-color-picker"><span>Color</span><select aria-label={`Color for ${product.name}`} value={product.variant_id ?? ""} onChange={(event) => changeVariant(product.cart_key ?? product.id, event.target.value)}>{product.variants.map((variant) => <option value={variant.id} key={variant.id}>{variant.name}</option>)}</select></label> : product.variant_name && <small className="cart-line-variant"><i style={{ background: product.variant_hex ?? "#245b86" }} />Color: {product.variant_name}</small>}<button className="store-text-button" type="button" onClick={() => remove(product.cart_key ?? product.id)}>Remove</button></div>
    <div className="cart-line-controls"><label>Qty <select value={quantity} onChange={(event) => setQuantity(product.cart_key ?? product.id, Number(event.target.value))}>{Array.from({ length: Math.max(1, Math.min(product.stock_quantity, 20)) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><b>{formatPrice(product.price_pesewas * quantity)}</b></div>
  </article>)}</section>
  <aside className="cart-summary"><p className="admin-kicker">ORDER TOTAL</p><h2>Summary</h2><div className="cart-summary-row"><span>Subtotal <small>({lines.length} {lines.length === 1 ? "item" : "items"})</small></span><b>{formatPrice(subtotal)}</b></div><div className="cart-summary-row"><span>Delivery</span><span className="cart-summary-muted">Calculated at checkout</span></div><p className="cart-delivery-note">We’ll confirm your delivery fee with you before dispatch.</p><Link className="store-primary-button full-button" href="/checkout">Continue to checkout <span>↗</span></Link><Link className="store-back-link" href="/shop">Continue shopping</Link><div className="cart-secure-note"><span aria-hidden="true">✓</span><small>Your order details are confirmed before you place your order.</small></div></aside></div>;
}
