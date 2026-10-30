import Link from "next/link";
import { getStoreProducts } from "@/lib/catalog";
import { ProductGrid, StoreFooter, StoreHeader } from "@/components/storefront";

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; collection?: string }> }) {
  const [{ category, q, collection }, products] = await Promise.all([searchParams, getStoreProducts()]);
  const activeCategory = category?.trim();
  const activeCollection = collection === "offers" || collection === "new" ? collection : "";
  const searchTerm = q?.trim() ?? "";
  const normalizedTerm = searchTerm.toLowerCase();
  const visible = products.filter((product) => {
    const matchesCategory = !activeCategory || product.category.toLowerCase().includes(activeCategory.toLowerCase());
    const searchable = [product.name, product.description ?? "", product.category, product.slug, product.tag ?? ""].join(" ").toLowerCase();
    const matchesCollection = activeCollection !== "offers" || (product.compare_at_pesewas !== null && product.compare_at_pesewas > product.price_pesewas);
    return matchesCategory && matchesCollection && (!normalizedTerm || searchable.includes(normalizedTerm));
  });
  const categories = Array.from(new Set(products.map((product) => product.category)));
  return <><StoreHeader /><main className="store-page-shell"><p className="store-breadcrumb"><Link href="/">Home</Link> / Shop</p><div className="store-page-heading"><p className="admin-kicker">{activeCollection === "offers" ? "LIMITED-TIME SAVINGS" : activeCollection === "new" ? "JUST ADDED TO THE COLLECTION" : "THE ANTWIPLUS COLLECTION"}</p><h1>{searchTerm ? <>Search results.</> : activeCollection === "offers" ? <>Special <em>offers.</em></> : activeCollection === "new" ? <>New <em>arrivals.</em></> : <>Find your <em>next favourite.</em></>}</h1><p>{searchTerm ? `${visible.length} result${visible.length === 1 ? "" : "s"} for “${searchTerm}”.` : activeCollection === "offers" ? "Explore products currently marked down in the AntwiPlus collection." : activeCollection === "new" ? "Discover the latest products added to the AntwiPlus collection." : "Explore considered finds across fashion, technology, home, travel, and more."}</p></div>
    <nav className="shop-filters" aria-label="Filter products"><Link className={!activeCategory ? "selected" : ""} href={searchTerm ? `/shop?q=${encodeURIComponent(searchTerm)}` : "/shop"}>All items</Link>{categories.map((name) => <Link className={activeCategory === name ? "selected" : ""} key={name} href={`/shop?category=${encodeURIComponent(name)}${searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ""}`}>{name}</Link>)}</nav>
    {visible.length ? <ProductGrid products={visible} /> : <div className="store-empty"><span>⌕</span><h2>{searchTerm ? `No products found for “${searchTerm}”.` : "No products in this category yet."}</h2><p>Try a different search or browse all AntwiPlus products.</p><Link className="store-primary-button" href="/shop">Browse all products <span>↗</span></Link></div>}
  </main><StoreFooter /></>;
}
