import type { CSSProperties } from "react";
import { Reveal } from "./reveal";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const products = [
  { name: "Everyday carry tote", category: "STYLE & ACCESSORIES", price: "GH₵ 185", oldPrice: "GH₵ 220", tag: "BESTSELLER", visual: "tote" },
  { name: "Studio wireless headphones", category: "TECH & AUDIO", price: "GH₵ 690", tag: "JUST IN", visual: "headphones" },
  { name: "Sunday ritual candle set", category: "HOME & LIVING", price: "GH₵ 240", visual: "candles" },
  { name: "The good skin essentials kit", category: "BEAUTY & CARE", price: "GH₵ 320", oldPrice: "GH₵ 380", tag: "SAVE 16%", visual: "beauty" },
];

const categories = [
  { name: "Home & living", icon: "⌂", color: "#e9eddf" },
  { name: "Tech & audio", icon: "◉", color: "#e7e6f1" },
  { name: "Style", icon: "✳", color: "#f4e7dc" },
  { name: "Beauty & care", icon: "✿", color: "#f2e3e4" },
];

function ProductVisual({ type }: { type: string }) {
  if (type === "tote") return <div className="product-art tote-art"><div className="tote-handle" /><div className="tote-body"><span>AP</span></div><i className="sparkle">✳</i></div>;
  if (type === "headphones") return <div className="product-art headphone-art"><div className="headband" /><div className="earcup left" /><div className="earcup right" /><i className="sound-wave">)))</i></div>;
  if (type === "candles") return <div className="product-art candle-art"><div className="candle c1"><i /><span>slow<br />mornings</span></div><div className="candle c2"><i /><span>soft<br />evenings</span></div><div className="candle c3"><i /><span>good<br />things</span></div></div>;
  return <div className="product-art beauty-art"><div className="bottle bottle-one"><b>GOOD<br />SKIN</b></div><div className="bottle bottle-two"><b>daily<br />glow</b></div><div className="jar"><b>AP<br />CARE</b></div><i className="beauty-leaf">✳</i></div>;
}

async function getStoreProducts() {
  if (!isSupabaseConfigured()) return products;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("products").select("name,category,price_pesewas,compare_at_pesewas,tag,visual").eq("is_active", true).order("created_at", { ascending: false });
    if (error || !data?.length) return products;
    const formatPrice = (pesewas: number) => `GH₵ ${(Number(pesewas) / 100).toLocaleString("en-GH", { maximumFractionDigits: 2 })}`;
    return data.map((product) => ({
      name: product.name,
      category: product.category,
      price: formatPrice(product.price_pesewas),
      oldPrice: product.compare_at_pesewas ? formatPrice(product.compare_at_pesewas) : undefined,
      tag: product.tag ?? undefined,
      visual: product.visual,
    }));
  } catch {
    return products;
  }
}

export default async function Home() {
  const storeProducts = await getStoreProducts();
  return (
    <main>
      <div className="announcement"><span>✦</span> A little something good, delivered to your door <span className="announcement-link">Shop the edit <b>↗</b></span></div>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="AntwiPlus home">antwi<span>+</span></a>
        <nav className="main-nav" aria-label="Main navigation"><a href="#shop">Shop all</a><a href="#categories">Categories</a><a href="#story">Our story</a></nav>
        <div className="header-actions"><button className="icon-button search-button" aria-label="Search">⌕</button><button className="icon-button account-button" aria-label="Account">♙</button><button className="bag-button" aria-label="Shopping bag">Bag <span>0</span></button><button className="menu-button" aria-label="Open menu">☰</button></div>
      </header>

      <section className="hero" id="top">
        <Reveal className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> A GOOD PLACE TO START</div>
          <h1>Good finds.<br /><em>Good feelings.</em></h1>
          <p>Thoughtful little upgrades for the everyday. Find your new favourite thing, right here.</p>
          <a className="button button-dark" href="#shop">Explore the shop <span>↗</span></a>
          <div className="hero-note"><span className="note-icon">✦</span><span>Picked with care.<br /><b>Delivered with a smile.</b></span></div>
        </Reveal>
        <Reveal className="hero-art" delay={140}>
          <div className="sun-disc" /><div className="hero-sticker">A LITTLE<br />MORE JOY <span>✳</span></div>
          <div className="hero-table"><div className="hero-vase"><div className="vase-stem stem-one" /><div className="vase-stem stem-two" /><div className="vase-stem stem-three" /></div><div className="hero-book book-one">THE ART OF<br />SLOW LIVING</div><div className="hero-book book-two">GOOD DAYS AHEAD</div><div className="hero-cup"><div /></div><div className="hero-plant"><i /><i /><i /><i /><b /></div></div>
          <div className="hero-caption"><span>THE EVERYDAY EDIT</span><b>Little things, done well.</b></div>
          <div className="hero-index">01 <span /> 04</div>
        </Reveal>
      </section>

      <Reveal><section className="trust-strip" aria-label="Shopping benefits"><div><span>✳</span> Good stuff, fair prices</div><i /><div><span>↗</span> Delivery across Ghana</div><i /><div><span>♡</span> A little joy in every order</div></section></Reveal>

      <Reveal><section className="category-section" id="categories">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> FIND YOUR THING</div><h2>A good place to <em>look around.</em></h2></div><a className="text-link" href="#shop">All categories <span>↗</span></a></div>
        <div className="category-grid">{categories.map((category, index) => <a className="category-card" style={{ "--card-delay": `${index * 75}ms` } as CSSProperties} href="#shop" key={category.name}><span className="category-icon" style={{ backgroundColor: category.color }}>{category.icon}</span><span>{category.name}</span><b>↗</b></a>)}</div>
      </section></Reveal>

      <Reveal><section className="products-section" id="shop">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE GOOD STUFF</div><h2>Things we're <em>loving.</em></h2></div><a className="text-link" href="#shop">Shop everything <span>↗</span></a></div>
        <div className="product-grid">{storeProducts.map((product, index) => <article className="product-card" style={{ "--card-delay": `${index * 75}ms` } as CSSProperties} key={product.name}><a className={`product-image ${product.visual}`} href="#shop" aria-label={`View ${product.name}`}><ProductVisual type={product.visual} />{product.tag && <span className="product-tag">{product.tag}</span>}<button className="quick-add" aria-label={`Add ${product.name} to bag`}>+</button></a><div className="product-meta"><div><div className="product-category">{product.category}</div><h3>{product.name}</h3></div><div className="product-price">{product.price}{product.oldPrice && <s>{product.oldPrice}</s>}</div></div></article>)}</div>
      </section></Reveal>

      <Reveal><section className="newsletter" id="story"><div><div className="eyebrow"><span className="eyebrow-line" /> A NOTE FROM US</div><h2>Good things<br />in your <em>inbox.</em></h2></div><div className="newsletter-right"><p>New finds, little treats, and the occasional note from us. No noise, just the good stuff.</p><form action="#story"><label className="sr-only" htmlFor="email">Your email address</label><input id="email" type="email" placeholder="Your email address" /><button type="submit" aria-label="Subscribe">↗</button></form><small>By subscribing, you agree to receive our occasional updates.</small></div><span className="newsletter-star">✳</span></section></Reveal>

      <footer className="site-footer"><a className="wordmark footer-logo" href="#top">antwi<span>+</span></a><span>Good finds for your everyday.</span><span>© 2026 AntwiPlus</span><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}

