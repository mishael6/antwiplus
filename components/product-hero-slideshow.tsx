"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StoreProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/currency";

type HeroSlide = {
  key: string;
  product: StoreProduct;
  imageUrl: string;
  colorName: string | null;
};

export function ProductHeroSlideshow({ products }: { products: StoreProduct[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides: HeroSlide[] = products.flatMap((product) => {
    const productImage = product.image_url ? [{ key: `${product.id}:main`, product, imageUrl: product.image_url, colorName: null }] : [];
    const colorImages = (product.variants ?? []).filter((variant) => Boolean(variant.image_url)).map((variant) => ({
      key: `${product.id}:${variant.id}`,
      product,
      imageUrl: variant.image_url,
      colorName: variant.name,
    }));
    return [...productImage, ...colorImages];
  });
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);
  useEffect(() => {
    function showSelectedColor(event: Event) {
      const detail = (event as CustomEvent<{ productId?: string; variantId?: string }>).detail;
      if (!detail?.productId || !detail.variantId) return;
      const index = slides.findIndex((slide) => slide.product.id === detail.productId && slide.key === `${detail.productId}:${detail.variantId}`);
      if (index >= 0) setActiveIndex(index);
    }
    window.addEventListener("antwiplus:product-color-selected", showSelectedColor);
    return () => window.removeEventListener("antwiplus:product-color-selected", showSelectedColor);
  }, [slides]);

  if (!slides.length) return <div className="product-showcase-empty"><span>THE ANTWIPLUS EDIT</span><b>Fresh finds, picked for you.</b><Link href="/shop">Explore all products ↗</Link><small>Product photos added in the admin will appear here.</small></div>;

  const activeSlide = slides[activeIndex % slides.length];
  const { product } = activeSlide;
  const hasDiscount = Boolean(product.compare_at_pesewas && product.compare_at_pesewas > product.price_pesewas);
  const discount = hasDiscount ? Math.round((1 - product.price_pesewas / (product.compare_at_pesewas as number)) * 100) : 0;
  const move = (amount: number) => setActiveIndex((index) => (index + amount + slides.length) % slides.length);

  return <section className="product-showcase" aria-label="Featured products" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <Link className="product-showcase-photo" href={`/products/${product.slug}`} key={activeSlide.key} aria-label={`Shop ${product.name}${activeSlide.colorName ? ` in ${activeSlide.colorName}` : ""}`}>
      <img src={activeSlide.imageUrl} alt={`${product.name}${activeSlide.colorName ? ` in ${activeSlide.colorName}` : ""}`} />
    </Link>
    <div className="product-showcase-info"><div className="product-showcase-copy"><span>{product.category}{activeSlide.colorName ? ` · ${activeSlide.colorName}` : ""}</span><Link href={`/products/${product.slug}`}><b>{product.name}</b></Link><div className="product-showcase-prices"><b>{formatPrice(product.price_pesewas)}</b>{hasDiscount && <><s>{formatPrice(product.compare_at_pesewas as number)}</s><em>Save {discount}%</em></>}</div></div><Link className="product-showcase-shop" href={`/products/${product.slug}`} aria-label={`Shop ${product.name}`}>Shop now <span>↗</span></Link></div>
    {slides.length > 1 && <div className="product-showcase-controls"><div className="product-showcase-dots" aria-label="Choose featured product">{slides.map((slide, index) => <button key={slide.key} type="button" className={index === activeIndex ? "active" : ""} onClick={() => setActiveIndex(index)} aria-label={`Show ${slide.product.name}${slide.colorName ? ` in ${slide.colorName}` : ""}`} aria-current={index === activeIndex ? "true" : undefined} />)}</div><div><button type="button" onClick={() => move(-1)} aria-label="Previous product">‹</button><button type="button" onClick={() => move(1)} aria-label="Next product">›</button></div></div>}
  </section>;
}
