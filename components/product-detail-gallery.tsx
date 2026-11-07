"use client";

import { useState } from "react";
import { AddToCartButton, type StoreColorVariant } from "@/components/cart";
import type { StoreProduct } from "@/lib/catalog";

export function ProductDetailGallery({ product }: { product: StoreProduct }) {
  const [selected, setSelected] = useState<StoreColorVariant | null>(product.variants[0] ?? null);
  const image = selected?.image_url || product.image_url;
  return <div className="product-detail-gallery">
    {image ? <img className="product-detail-image" src={image} alt={`${product.name}${selected ? ` in ${selected.name}` : ""}`} /> : <div className="product-detail-image product-detail-image-empty"><span aria-hidden="true">{product.category.toLowerCase().includes("luggage") ? "◈" : "◒"}</span></div>}
    {product.variants.length > 0 && <div className="product-detail-variant-thumbs" aria-label="Available product colors">{product.variants.map((variant) => <button type="button" key={variant.id} onClick={() => setSelected(variant)} className={`${selected?.id === variant.id ? "selected" : ""}${variant.stock_quantity < 1 ? " out-of-stock" : ""}`} aria-pressed={selected?.id === variant.id} aria-label={`Show ${variant.name} photo${variant.stock_quantity < 1 ? ", out of stock" : `, ${variant.stock_quantity} available`}`}><img src={variant.image_url} alt="" /><span><i style={{ background: variant.hex }} />{variant.name}</span><small>{variant.stock_quantity < 1 ? "Out of stock" : `${variant.stock_quantity} available`}</small></button>)}</div>}
    <AddToCartButton product={product} variants={product.variants} showVariantOptions={false} selectedVariantId={selected?.id ?? null} onVariantSelect={setSelected} />
  </div>;
}
