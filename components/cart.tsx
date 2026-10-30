"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price_pesewas: number;
  image_url: string | null;
  visual: string;
  stock_quantity: number;
};

type CartLine = { product: CartProduct; quantity: number };
type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (product: CartProduct) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
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
    const found = current.find((line) => line.product.id === product.id);
    if (found) return current.map((line) => line.product.id === product.id ? { ...line, product, quantity: Math.min(product.stock_quantity || 99, line.quantity + 1) } : line);
    return [...current, { product, quantity: 1 }];
  }), []);
  const setQuantity = useCallback((id: string, quantity: number) => setLines((current) => quantity < 1 ? current.filter((line) => line.product.id !== id) : current.map((line) => line.product.id === id ? { ...line, quantity: Math.min(line.product.stock_quantity || 99, quantity) } : line)), []);
  const remove = useCallback((id: string) => setLines((current) => current.filter((line) => line.product.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo(() => ({ lines, ready, count: lines.reduce((sum, line) => sum + line.quantity, 0), subtotal: lines.reduce((sum, line) => sum + line.product.price_pesewas * line.quantity, 0), add, setQuantity, remove, clear }), [lines, ready, add, setQuantity, remove, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

export function AddToCartButton({ product }: { product: CartProduct }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return <button className="store-add-button" type="button" disabled={product.stock_quantity < 1} onClick={() => { add(product); setAdded(true); window.setTimeout(() => setAdded(false), 1300); }}>{product.stock_quantity < 1 ? "Sold out" : added ? "Added to cart ✓" : "Add to cart +"}</button>;
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
