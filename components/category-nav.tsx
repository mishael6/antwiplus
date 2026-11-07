"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, MouseEvent } from "react";
import { StoreIcon } from "@/components/store-icon";

export function CategoryNav({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const root = useRef<HTMLDivElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => setReady(true), []);

  const updatePosition = useCallback(() => {
    const bounds = trigger.current?.getBoundingClientRect();
    if (!bounds) return;
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const width = Math.min(700, window.innerWidth - (mobile ? 20 : 24));
    const left = mobile ? 10 : Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12));
    setMenuStyle({ position: "fixed", top: bounds.bottom + (mobile ? 8 : 0), left, width, maxHeight: `calc(100dvh - ${Math.max(bounds.bottom + (mobile ? 16 : 8), 24)}px)`, zIndex: 1000 });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const dismissOutside = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !dropdown.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", dismissOutside);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", dismissOutside);
    };
  }, [open, updatePosition]);

  const closeOnBlur = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!root.current?.contains(next) && !dropdown.current?.contains(next)) setOpen(false);
  };
  const closeOnMouseLeave = (event: MouseEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!root.current?.contains(next) && !dropdown.current?.contains(next)) setOpen(false);
  };
  const openOnHover = () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      updatePosition();
      setOpen(true);
    }
  };

  const menu = open && ready && <div ref={dropdown} className="category-nav-dropdown" role="menu" aria-label="Shop by category" style={menuStyle} onFocusCapture={() => setOpen(true)} onBlurCapture={closeOnBlur} onMouseEnter={openOnHover} onMouseLeave={closeOnMouseLeave} onKeyDown={(event) => {
    if (event.key === "Escape") {
      setOpen(false);
      trigger.current?.focus();
    }
  }}>
    <div className="category-nav-dropdown-head"><div><b>Shop by category</b><span>Explore the AntwiPlus collection</span></div><Link href="/shop" role="menuitem" onClick={() => setOpen(false)}>View all products <StoreIcon name="arrow" /></Link></div>
    <div className="category-nav-grid">{categories.map((category) => <Link key={category} role="menuitem" href={`/shop?category=${encodeURIComponent(category)}`} onClick={() => setOpen(false)}>{category}<StoreIcon aria-hidden="true" name="chevronRight" /></Link>)}</div>
  </div>;

  return <div className="category-nav" ref={root} onMouseEnter={openOnHover} onMouseLeave={closeOnMouseLeave} onBlurCapture={closeOnBlur} onKeyDown={(event) => {
    if (event.key === "Escape") {
      setOpen(false);
      trigger.current?.focus();
    }
  }}>
    <button ref={trigger} className="category-nav-trigger" type="button" aria-haspopup="true" aria-expanded={open} onClick={() => {
      if (open) setOpen(false);
      else {
        updatePosition();
        setOpen(true);
      }
    }}>
      <StoreIcon className="category-menu-icon" name="menu" /> Categories <StoreIcon className="category-chevron" name="chevronDown" />
    </button>
    {ready && menu ? createPortal(menu, document.body) : null}
  </div>;
}
