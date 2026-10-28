import Link from "next/link";
import { getStoreProducts } from "@/lib/catalog";
import { ProductGrid, StoreFooter, StoreHeader } from "@/components/storefront";
import { Reveal } from "./reveal";

export default async function Home() {
  const products = await getStoreProducts();
  const featured = products.slice(0, 4);
  return <main className="store-home">
    <StoreHeader />
    <section className="bag-hero">
      <Reveal className="bag-hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> FOR THE EVERYDAY & THE GETAWAY</div><h1>Carry a little<br /><em>more joy.</em></h1><p>Find the bag that goes everywhere with you, or luggage ready for wherever you’re headed next.</p><Link className="button button-dark" href="/shop">Shop bags & luggage <span>↗</span></Link><div className="hero-note"><span className="note-icon">✦</span><span>Picked with care.<br /><b>Ready for wherever life takes you.</b></span></div></Reveal>
      <Reveal className="bag-hero-art" delay={120}><div className="bag-hero-sun" /><div className="bag-illustration"><div className="bag-handle" /><div className="bag-body"><span>ANTWI+</span></div><i className="bag-charm">✳</i></div><div className="luggage-illustration"><div className="luggage-handle" /><div className="luggage-body"><span>GO<br />PLACES</span></div><div className="luggage-wheel left" /><div className="luggage-wheel right" /></div><div className="bag-caption"><span>THE EVERYDAY EDIT</span><b>Made to go with you.</b></div><div className="bag-sticker">YOUR NEXT<br />ADVENTURE <span>✳</span></div></Reveal>
    </section>
    <Reveal><section className="trust-strip" aria-label="Shopping benefits"><div><span>✳</span> Carefully chosen styles</div><i /><div><span>↗</span> Delivery across Ghana</div><i /><div><span>♡</span> Here to help if you need us</div></section></Reveal>
    <Reveal><section className="shop-categories"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> START WITH YOUR EVERYDAY</div><h2>What's the <em>occasion?</em></h2></div><Link className="text-link" href="/shop">Shop everything <span>↗</span></Link></div><div className="category-grid"><Link className="category-card" href="/shop?category=Handbags"><span className="category-icon category-handbag">◒</span><span>Handbags</span><b>↗</b></Link><Link className="category-card" href="/shop?category=Luggage"><span className="category-icon category-luggage">◈</span><span>Luggage & travel</span><b>↗</b></Link><Link className="category-card" href="/shop?category=Accessories"><span className="category-icon category-accessory">✳</span><span>Accessories</span><b>↗</b></Link><Link className="category-card" href="/shop"><span className="category-icon category-everyday">✦</span><span>Everyday finds</span><b>↗</b></Link></div></section></Reveal>
    <Reveal><section className="products-section home-products"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE GOOD STUFF</div><h2>Made to <em>go with you.</em></h2></div><Link className="text-link" href="/shop">Shop all bags & luggage <span>↗</span></Link></div><ProductGrid products={featured} /></section></Reveal>
    <Reveal><section className="story-band"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR STYLE, YOUR JOURNEY</div><h2>Little details.<br /><em>Big destinations.</em></h2></div><p>We believe the right everyday bag makes everything feel a little more put together, and the right suitcase makes leaving home something to look forward to.</p><Link className="button button-dark" href="/about">A little about us <span>↗</span></Link></section></Reveal>
    <StoreFooter />
  </main>;
}
