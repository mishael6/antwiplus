import Link from "next/link";
import { getStoreProducts } from "@/lib/catalog";
import { ProductGrid, StoreFooter, StoreHeader } from "@/components/storefront";

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [{ category }, products] = await Promise.all([searchParams, getStoreProducts()]);
  const activeCategory = category?.trim();
  const visible = activeCategory ? products.filter((product) => product.category.toLowerCase().includes(activeCategory.toLowerCase())) : products;
  const categories = Array.from(new Set(products.map((product) => product.category)));
  return <><StoreHeader /><main className="store-page-shell"><p className="store-breadcrumb"><Link href="/">Home</Link> / Shop</p><div className="store-page-heading"><p className="admin-kicker">BAGS, LUGGAGE & EVERYDAY FINDS</p><h1>Find your <em>next favourite.</em></h1><p>Handbags for every day, luggage for every journey, and little extras along the way.</p></div>
    <nav className="shop-filters" aria-label="Filter products"><Link className={!activeCategory ? "selected" : ""} href="/shop">All items</Link>{categories.map((name) => <Link className={activeCategory === name ? "selected" : ""} key={name} href={`/shop?category=${encodeURIComponent(name)}`}>{name}</Link>)}</nav>
    <ProductGrid products={visible} />
  </main><StoreFooter /></>;
}
