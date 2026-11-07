"use client";

import { ArrowIcon } from "@/components/arrow-icon";

import Link from "next/link";
import { useState } from "react";
import { AddToCartButton, type StoreColorVariant } from "@/components/cart";
import type { StoreProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/currency";

export function ProductCard({ product }: { product: StoreProduct }) {
  const [selectedVariant, setSelectedVariant] = useState<StoreColorVariant | null>(product.variants[0] ?? null);
  const imageUrl = selectedVariant?.image_url || product.image_url;
  return <article className="store-product-card">
    <Link className="store-product-image" href={`/products/${product.slug}`} style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined} aria-label={`View ${product.name}${selectedVariant ? ` in ${selectedVariant.name}` : ""}`}>
      {!imageUrl && <span aria-hidden="true" className="product-placeholder">{product.category.toLowerCase().includes("luggage") || product.category.toLowerCase().includes("travel") ? "◈" : "◒"}</span>}
      {product.tag && <span className="product-tag">{product.tag}</span>}
    </Link>
    <div className="store-product-meta"><div>{product.brand && <span className="product-brand">{product.brand}</span>}<span className="product-category">{product.category}</span><Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link></div><span className="product-price">{formatPrice(product.price_pesewas)}</span></div>
    <Link className="product-view-details" href={`/products/${product.slug}`}>View details <span><ArrowIcon /></span></Link>
    <AddToCartButton product={product} variants={product.variants} selectedVariantId={selectedVariant?.id ?? null} onVariantSelect={setSelectedVariant} />
  </article>;
}
