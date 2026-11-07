"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { StoreProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/currency";

type HeroSlide = { product: StoreProduct; imageUrl: string; colorName: string | null };

export function ProductHeroSlideshow({ products }: { products: StoreProduct[] }) {
  const slides: HeroSlide[] = products.flatMap((product) => {
    const primaryColor = product.variants?.[0];
    const imageUrl = primaryColor?.image_url || product.image_url;
    return imageUrl ? [{ product, imageUrl, colorName: primaryColor?.name ?? null }] : [];
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % slides.length), 4500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  if (!slides.length) return <section className="product-showcase product-showcase-empty" aria-label="Featured product"><span>THE ANTWIPLUS EDIT</span><b>Fresh finds, picked for you.</b><small>Product photos added in the admin will appear here.</small></section>;

  const activeSlide = slides[activeIndex % slides.length];
  const { product } = activeSlide;
  const primaryColor = product.variants[0];
  const backdropColor = primaryColor && /^#[0-9a-f]{6}$/i.test(primaryColor.hex) ? primaryColor.hex : "#f4c542";
  const discounted = Boolean(product.compare_at_pesewas && product.compare_at_pesewas > product.price_pesewas);
  const discount = discounted ? Math.round((1 - product.price_pesewas / (product.compare_at_pesewas as number)) * 100) : 0;
  const move = (amount: number) => setActiveIndex((index) => (index + amount + slides.length) % slides.length);

  return <section className="product-showcase product-showcase-hero" style={{ "--showcase-color": backdropColor } as CSSProperties} aria-label="Featured products" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <span className="product-showcase-overline">THE ANTWIPLUS EDIT</span>
    {discounted && <span className="product-showcase-sale">SAVE {discount}%</span>}
    <img className="product-showcase-image" src={activeSlide.imageUrl} alt={`${product.name}${activeSlide.colorName ? ` in ${activeSlide.colorName}` : ""}`} key={activeSlide.imageUrl} />
    <div className="product-showcase-caption"><span>{product.category}{activeSlide.colorName ? ` · ${activeSlide.colorName}` : ""}</span><b>{product.name}</b><div><strong>{formatPrice(product.price_pesewas)}</strong>{discounted && <s>{formatPrice(product.compare_at_pesewas as number)}</s>}</div></div>
    {slides.length > 1 && <div className="product-showcase-controls"><span>{String(activeIndex + 1).padStart(2, "0")} <i /> {String(slides.length).padStart(2, "0")}</span><div><button type="button" onClick={() => move(-1)} aria-label="Previous product">‹</button><button type="button" onClick={() => move(1)} aria-label="Next product">›</button></div></div>}
  </section>;
}
