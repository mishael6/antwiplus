import Link from "next/link";
import type { StoreProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";
import { AddToCartButton, CartCount } from "@/components/cart";

export function StoreHeader() {
  return <>
    <div className="announcement"><span>✦</span> Thoughtful finds for your everyday <span className="announcement-link">Delivery across Ghana</span></div>
    <header className="site-header"><Link className="wordmark" href="/" aria-label="AntwiPlus home">antwi<span>+</span></Link>
      <nav className="main-nav" aria-label="Main navigation"><Link href="/shop">Shop all</Link><Link href="/shop?category=Handbags">Handbags</Link><Link href="/shop?category=Luggage">Luggage</Link><Link href="/about">Our story</Link></nav>
      <div className="header-actions"><Link className="icon-button account-button" href="/account" aria-label="Your account">♙</Link><CartCount /></div>
    </header>
  </>;
}

export function StoreFooter() {
  return <footer className="site-footer store-footer"><Link className="wordmark footer-logo" href="/">antwi<span>+</span></Link><span>Everyday style, wherever you’re going.</span><nav><Link href="/contact">Contact</Link><Link href="/shipping-returns">Shipping & returns</Link><Link href="/admin">Store admin</Link></nav><span>© 2026 AntwiPlus</span></footer>;
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
