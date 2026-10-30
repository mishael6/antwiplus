import Link from "next/link";
import { getStoreProducts, getStoreCategories } from "@/lib/catalog";
import { ProductGrid, StoreFooter, StoreHeader } from "@/components/storefront";
import { Reveal } from "./reveal";

export default async function Home() {
  const [products, categories] = await Promise.all([getStoreProducts(), getStoreCategories()]);
  const featured = products.slice(0, 4);
  return <main className="store-home">
    <StoreHeader />
    <section className="bag-hero">
      <Reveal className="bag-hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> GOOD FINDS, FROM EVERYWHERE</div><h1>More to love.<br /><em>More to explore.</em></h1><p>Discover thoughtful finds from around the world, from everyday essentials and personal style to tech, home, travel, and more.</p><Link className="button button-dark" href="/shop">Explore the collection <span>↗</span></Link><div className="hero-note"><span className="note-icon">✦</span><span>One place for all your finds.<br /><b>Chosen for everyday life.</b></span></div></Reveal>
      <Reveal className="collection-visual" delay={120}><div className="collection-visual-top"><span>THE ANTWIPLUS EDIT</span><span>01 — 04</span></div><div className="collection-visual-title">A world of<br/><em>good finds.</em></div><div className="collection-orbit" aria-hidden="true"><i/><i/><i/></div><div className="collection-tiles"><Link href="/shop?category=Fashion"> <span>✳</span><b>Style</b><small>Everyday essentials</small></Link><Link href="/shop?category=Phones%20%26%20electronics"><span>⌁</span><b>Technology</b><small>Smart picks</small></Link><Link href="/shop?category=Home%20%26%20kitchen"><span>◇</span><b>Home</b><small>Made for living</small></Link></div><div className="collection-visual-footer"><span>Curated for life, wherever it takes you</span><Link href="/shop">Browse collection ↗</Link></div></Reveal>
    </section>
    <Reveal><section className="trust-strip" aria-label="Shopping benefits"><div><span>✳</span> Carefully chosen styles</div><i /><div><span>↗</span> Delivery across Ghana</div><i /><div><span>♡</span> Here to help if you need us</div></section></Reveal>
    <Reveal><section className="shop-categories"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> SOMETHING FOR EVERY DAY</div><h2>Explore our <em>categories.</em></h2></div><Link className="text-link" href="/shop">Shop everything <span>↗</span></Link></div><div className="category-grid">{categories.slice(0, 8).map((category, index) => <Link className="category-card" key={category} href={`/shop?category=${encodeURIComponent(category)}`}><span className={`category-icon category-tone-${index % 4}`}>{["✦", "◈", "✳", "◇"][index % 4]}</span><span>{category}</span><b>↗</b></Link>)}</div></section></Reveal>
    <Reveal><section className="products-section home-products"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE GOOD STUFF</div><h2>New finds, <em>picked for you.</em></h2></div><Link className="text-link" href="/shop">Shop all products <span>↗</span></Link></div><ProductGrid products={featured} /></section></Reveal>
    <Reveal><section className="story-band"><div><div className="eyebrow"><span className="eyebrow-line" /> THE ANTWIPLUS DIFFERENCE</div><h2>Find more of<br /><em>what you love.</em></h2></div><p>From useful everyday essentials to pieces that make you smile, we bring good finds from around the world a little closer to home.</p><Link className="button button-dark" href="/about">A little about us <span>↗</span></Link></section></Reveal>
    <StoreFooter />
  </main>;
}
