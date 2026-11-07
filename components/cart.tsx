"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  brand?: string | null;
  price_pesewas: number;
  image_url: string | null;
  stock_quantity: number;
  variant_id?: string | null;
  variant_name?: string | null;
  variant_hex?: string | null;
  cart_key?: string;
  variants?: StoreColorVariant[];
};

export type StoreColorVariant = { id: string; name: string; hex: string; image_url: string };

type CartLine = { product: CartProduct; quantity: number };
type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (product: CartProduct) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  changeVariant: (cartKey: string, variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_KEY = "antwiplus-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_KEY);
      if (saved) setLines(JSON.parse(saved) as CartLine[]);
    } catch {
      window.localStorage.removeItem(CART_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((product: CartProduct) => setLines((current) => {
    const key = product.cart_key ?? product.id;
    const found = current.find((line) => (line.product.cart_key ?? line.product.id) === key);
    if (found) return current.map((line) => (line.product.cart_key ?? line.product.id) === key ? { ...line, product, quantity: Math.min(product.stock_quantity || 99, line.quantity + 1) } : line);
    return [...current, { product, quantity: 1 }];
  }), []);
  const setQuantity = useCallback((id: string, quantity: number) => setLines((current) => quantity < 1 ? current.filter((line) => (line.product.cart_key ?? line.product.id) !== id) : current.map((line) => (line.product.cart_key ?? line.product.id) === id ? { ...line, quantity: Math.min(line.product.stock_quantity || 99, quantity) } : line)), []);
  const remove = useCallback((id: string) => setLines((current) => current.filter((line) => (line.product.cart_key ?? line.product.id) !== id)), []);
  const changeVariant = useCallback((cartKey: string, variantId: string) => setLines((current) => {
    const line = current.find((item) => (item.product.cart_key ?? item.product.id) === cartKey);
    const variant = line?.product.variants?.find((item) => item.id === variantId);
    if (!line || !variant) return current;
    const nextKey = `${line.product.id}:${variant.id}`;
    const existing = current.find((item) => (item.product.cart_key ?? item.product.id) === nextKey);
    if (existing && nextKey !== cartKey) {
      return current.filter((item) => (item.product.cart_key ?? item.product.id) !== cartKey).map((item) => (item.product.cart_key ?? item.product.id) === nextKey ? { ...item, quantity: Math.min(item.product.stock_quantity || 99, item.quantity + line.quantity) } : item);
    }
    return current.map((item) => (item.product.cart_key ?? item.product.id) === cartKey ? { ...item, product: { ...item.product, image_url: variant.image_url, variant_id: variant.id, variant_name: variant.name, variant_hex: variant.hex, cart_key: nextKey } } : item);
  }), []);
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo(() => ({ lines, ready, count: lines.reduce((sum, line) => sum + line.quantity, 0), subtotal: lines.reduce((sum, line) => sum + line.product.price_pesewas * line.quantity, 0), add, setQuantity, remove, changeVariant, clear }), [lines, ready, add, setQuantity, remove, changeVariant, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

export function AddToCartButton({ product, variants = [], showVariantOptions = true, selectedVariantId, onVariantSelect }: { product: CartProduct; variants?: StoreColorVariant[]; showVariantOptions?: boolean; selectedVariantId?: string | null; onVariantSelect?: (variant: StoreColorVariant) => void }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [localSelected, setLocalSelected] = useState<StoreColorVariant | null>(variants[0] ?? null);
  const selected = selectedVariantId ? variants.find((variant) => variant.id === selectedVariantId) ?? null : localSelected;
  const selectedProduct = selected ? { ...product, variants, image_url: selected.image_url, variant_id: selected.id, variant_name: selected.name, variant_hex: selected.hex, cart_key: `${product.id}:${selected.id}` } : product;
  return <div className="add-product-actions">{showVariantOptions && variants.length > 0 && <fieldset className="product-color-choice"><legend>Available colors{selected ? ` · Selected: ${selected.name}` : ""}</legend><div>{variants.map((variant) => <button key={variant.id} type="button" className={`product-color-swatch${selected?.id === variant.id ? " selected" : ""}`} style={{ "--swatch-color": variant.hex } as CSSProperties} onClick={() => { setLocalSelected(variant); onVariantSelect?.(variant); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("antwiplus:product-color-selected", { detail: { productId: product.id, variantId: variant.id } })); }} aria-label={`Choose ${variant.name}`} aria-pressed={selected?.id === variant.id} title={variant.name}>{variant.image_url && <img src={variant.image_url} alt="" />}<span>{variant.name}</span></button>)}</div></fieldset>}<button className="store-add-button" type="button" disabled={product.stock_quantity < 1 || (variants.length > 0 && !selected)} onClick={() => { add(selectedProduct); setAdded(true); window.setTimeout(() => setAdded(false), 1300); }}>{product.stock_quantity < 1 ? "Sold out" : added ? "Added to cart ✓" : "Add to cart +"}</button></div>;
}

export function CartCount() {
  const { count } = useCart();
  return <Link className="store-cart-link" href="/cart" aria-label={`Shopping cart, ${count} ${count === 1 ? "item" : "items"}`}><span className="store-cart-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="9.5" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg><span className="store-cart-count">{count}</span></span><span className="store-cart-copy"><b>Shopping cart</b><small>{count} {count === 1 ? "item" : "items"}</small></span><span className="store-cart-arrow" aria-hidden="true">›</span></Link>;
}

export function ClearCartOnLoad() {
  const { clear } = useCart();
  useEffect(() => { clear(); }, [clear]);
  return null;
}
