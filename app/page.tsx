import Link from "next/link";
import { getStoreProducts, getStoreCategories } from "@/lib/catalog";
import { ProductGrid, StoreFooter, StoreHeader } from "@/components/storefront";
import { StoreIcon, iconForCategory } from "@/components/store-icon";
import { Reveal } from "./reveal";
import { ProductHeroSlideshow } from "@/components/product-hero-slideshow";

export default async function Home() {
  const [products, categories] = await Promise.all([getStoreProducts(), getStoreCategories()]);
  const featured = products.slice(0, 4);
  return <main className="store-home">
    <StoreHeader />
    <section className="bag-hero home-hero">
      <Reveal className="bag-hero-copy home-hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> GOOD FINDS, FROM EVERYWHERE</div><h1>More to love.<br /><em>More to explore.</em></h1><p>Discover thoughtful finds from around the world, from everyday essentials and personal style to tech, home, travel, and more.</p><Link className="button button-dark home-hero-button" href="/shop">Explore the collection <StoreIcon name="arrow" /></Link><div className="hero-note"><span className="note-icon"><StoreIcon name="sparkle" /></span><span>One place for all your finds.<br /><b>Chosen for everyday life.</b></span></div></Reveal>
      <Reveal className="home-product-showcase" delay={120}><ProductHeroSlideshow products={products} /></Reveal>
    </section>
    <Reveal><section className="trust-strip" aria-label="Shopping benefits"><div><span><StoreIcon name="sparkle" /></span> Carefully chosen styles</div><i /><div><span><StoreIcon name="delivery" /></span> Delivery across Ghana</div><i /><div><span><StoreIcon name="support" /></span> Here to help if you need us</div></section></Reveal>
    <Reveal><section className="shop-categories"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> SOMETHING FOR EVERY DAY</div><h2>Explore our <em>categories.</em></h2></div><Link className="text-link" href="/shop">Shop everything <StoreIcon name="arrow" /></Link></div><div className="category-grid">{categories.slice(0, 8).map((category) => <Link className="category-card" key={category} href={`/shop?category=${encodeURIComponent(category)}`}><span className="category-icon"><StoreIcon name={iconForCategory(category)} /></span><span>{category}</span><StoreIcon className="category-arrow" name="arrow" /></Link>)}</div></section></Reveal>
    <Reveal><section className="products-section home-products"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE GOOD STUFF</div><h2>New finds, <em>picked for you.</em></h2></div><Link className="text-link" href="/shop">Shop all products <StoreIcon name="arrow" /></Link></div><ProductGrid products={featured} /></section></Reveal>
    <Reveal><section className="story-band"><div><div className="eyebrow"><span className="eyebrow-line" /> THE ANTWIPLUS DIFFERENCE</div><h2>Find more of<br /><em>what you love.</em></h2></div><p>From useful everyday essentials to pieces that make you smile, we bring good finds from around the world a little closer to home.</p><Link className="button button-dark" href="/about">A little about us <StoreIcon name="arrow" /></Link></section></Reveal>
    <StoreFooter />
  </main>;
}
