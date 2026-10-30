"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export function CategoryNav({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  return <div className="category-nav" ref={root} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocusCapture={() => setOpen(true)} onBlurCapture={(event) => {
    if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
  }} onKeyDown={(event) => {
    if (event.key === "Escape") {
      setOpen(false);
      trigger.current?.focus();
    }
  }}>
    <button ref={trigger} className="category-nav-trigger" type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="category-menu-icon" aria-hidden="true">☰</span> Categories <span className="category-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="category-nav-dropdown" role="menu" aria-label="Shop by category">
      <div className="category-nav-dropdown-head"><div><b>Shop by category</b><span>Explore the AntwiPlus collection</span></div><Link href="/shop" role="menuitem" onClick={() => setOpen(false)}>View all products →</Link></div>
      <div className="category-nav-grid">{categories.map((category) => <Link key={category} role="menuitem" href={`/shop?category=${encodeURIComponent(category)}`} onClick={() => setOpen(false)}>{category}<span aria-hidden="true">›</span></Link>)}</div>
    </div>}
  </div>;
}
