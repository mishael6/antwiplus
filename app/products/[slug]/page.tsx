import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/cart";
import { StoreFooter, StoreHeader } from "@/components/storefront";
import { formatPrice, getStoreProduct } from "@/lib/catalog";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) notFound();
  return <><StoreHeader /><main className="store-page-shell"><p className="store-breadcrumb"><Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / {product.name}</p><section className="product-detail"><div className="product-detail-image" style={product.image_url ? { backgroundImage: `url("${product.image_url}")` } : undefined}>{!product.image_url && <span aria-hidden="true">{product.category.toLowerCase().includes("luggage") ? "◈" : "◒"}</span>}</div><div className="product-detail-copy"><p className="admin-kicker">{product.category}</p><h1>{product.name}</h1><p className="detail-price">{formatPrice(product.price_pesewas)}{product.compare_at_pesewas && <s>{formatPrice(product.compare_at_pesewas)}</s>}</p><p className="detail-description">{product.description || "A thoughtfully chosen AntwiPlus find, ready to make your everyday a little easier and your next journey a little more special."}</p><p className="detail-stock">{product.stock_quantity > 0 ? "In stock and ready to go" : "Currently sold out"}</p><AddToCartButton product={product} /><ul className="product-promises"><li>Delivery available across Ghana</li><li>Need help? <Link href="/contact">Talk to our team</Link></li></ul></div></section></main><StoreFooter /></>;
}
