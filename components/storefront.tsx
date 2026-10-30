import Link from "next/link";
import type { StoreProduct } from "@/lib/catalog";
import { formatPrice, getStoreCategories } from "@/lib/catalog";
import { AddToCartButton, CartCount } from "@/components/cart";
import { getStoreSettings } from "@/lib/store-settings";
import { CategoryNav } from "@/components/category-nav";
import { createClient } from "@/lib/supabase/server";

export async function StoreHeader() {
  const [settings, categories, customer] = await Promise.all([
    getStoreSettings(),
    getStoreCategories(),
    (async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from("customer_profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      return { name: profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "there" };
    })(),
  ]);
  return <>
    <div className="announcement"><span>✦</span> {settings.announcement} <span className="announcement-link">{settings.delivery_note}</span></div>
    <header className="site-header"><div className="store-header-main"><Link className="wordmark" href="/" aria-label="AntwiPlus home">antwi<span>+</span></Link>
      <form className="store-search" action="/shop" method="get" role="search"><label className="sr-only" htmlFor="store-search-query">Search products</label><input id="store-search-query" name="q" type="search" placeholder="Search all products and categories" /><button type="submit" aria-label="Search AntwiPlus"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.4 4.4"/></svg></button></form>
      <div className="header-actions"><Link className={`store-account-link${customer ? " is-signed-in" : ""}`} href="/account" aria-label={customer ? `Signed in as ${customer.name}. View your account` : "Sign in or view your account"}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.4-3.3 2.8-5.2 6.5-5.2s6.1 1.9 6.5 5.2"/></svg><span>{customer ? <><b>Hi, {customer.name}</b><small>Signed in · My orders</small></> : <>Account<small>Sign in</small></>}</span></Link><CartCount /></div>
    </div><nav className="main-nav" aria-label="Main navigation"><div className="main-nav-links"><CategoryNav categories={categories}/><Link href="/shop?collection=new">New arrivals</Link><Link href="/shop">Shop all</Link><Link href="/shop?collection=offers">Special offers</Link><Link href="/track-order">Track an order</Link><Link href="/contact">Contact</Link><Link href="/about">About AntwiPlus</Link></div></nav></header>
  </>;
}

export async function StoreFooter() {
  const settings = await getStoreSettings();
  return <footer className="site-footer store-footer"><Link className="wordmark footer-logo" href="/">antwi<span>+</span></Link><span>Thoughtful finds for everyday life.</span><nav><Link href="/track-order">Track an order</Link>{settings.support_email ? <Link href={`mailto:${settings.support_email}`}>Contact</Link> : <Link href="/contact">Contact</Link>}{settings.support_phone && <a href={`tel:${settings.support_phone.replace(/[^+\d]/g, "")}`}>Call us</a>}<Link href="/shipping-returns">Shipping & returns</Link><Link href="/admin">Store admin</Link></nav><span>© 2026 AntwiPlus</span></footer>;
}

export function ProductCard({ product }: { product: StoreProduct }) {
  return <article className="store-product-card">
    <Link className="store-product-image" href={`/products/${product.slug}`} style={product.image_url ? { backgroundImage: `url("${product.image_url}")` } : undefined} aria-label={`View ${product.name}`}>
      {!product.image_url && <span aria-hidden="true" className="product-placeholder">{product.category.toLowerCase().includes("luggage") || product.category.toLowerCase().includes("travel") ? "◈" : "◒"}</span>}
      {product.tag && <span className="product-tag">{product.tag}</span>}
    </Link>
    <div className="store-product-meta"><div><span className="product-category">{product.category}</span><Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link></div><span className="product-price">{formatPrice(product.price_pesewas)}</span></div>
    <AddToCartButton product={product} />
  </article>;
}

export function ProductGrid({ products }: { products: StoreProduct[] }) {
  if (!products.length) return <div className="store-empty"><span>✳</span><h2>Your next favourite is on its way.</h2><p>We’re getting the shop ready. Please check back soon.</p></div>;
  return <div className="store-product-grid">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div>;
}
