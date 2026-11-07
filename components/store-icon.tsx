import type { ReactNode, SVGProps } from "react";

export type StoreIconName = "sparkle" | "arrow" | "delivery" | "support" | "fashion" | "technology" | "home" | "travel" | "beauty" | "sports" | "book" | "gift" | "grid";

const paths: Record<StoreIconName, ReactNode> = {
  sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></>,
  arrow: <><path d="M7 17 17 7"/><path d="M8 7h9v9"/></>,
  delivery: <><path d="M3 7h11v11H3z"/><path d="M14 11h4l3 3v4h-7z"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="17.5" cy="18.5" r="1.5"/></>,
  support: <><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><path d="M4 13h3v6H6a2 2 0 0 1-2-2v-4Zm16 0h-3v6h1a2 2 0 0 0 2-2v-4Z"/><path d="M17 19a5 5 0 0 1-5 2"/></>,
  fashion: <><path d="m8 5 4-2 4 2 4 3-2 4-2-1v10H8V11l-2 1-2-4 4-3Z"/><path d="M9 6c.5 2 1.5 3 3 3s2.5-1 3-3"/></>,
  technology: <><rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M10 5h4M11 18.5h2"/></>,
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></>,
  travel: <><rect x="4" y="7" width="16" height="14" rx="2"/><path d="M9 7V4h6v3M4 12h16M9 12v2m6-2v2"/></>,
  beauty: <><path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3"/><path d="M8 15h8"/></>,
  sports: <><circle cx="12" cy="12" r="9"/><path d="m8 4 2 5-4 3m12 2-5-1-2 5m3-13-1 4 4 3"/></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 16a2.5 2.5 0 0 1 2.5-2.5H20M8 7h8"/></>,
  gift: <><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M2 6h20v3H2zM12 6v15m0-15H8a2 2 0 1 1 2-2c0 1.1 2 2 2 2Zm0 0h4a2 2 0 1 0-2-2c0 1.1-2 2-2 2Z"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
};

export function StoreIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: StoreIconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}

export function iconForCategory(category: string): StoreIconName {
  const value = category.toLowerCase();
  if (/fashion|shoe|bag|cloth|accessor/.test(value)) return "fashion";
  if (/tech|phone|electronic|computer/.test(value)) return "technology";
  if (/home|kitchen|furniture/.test(value)) return "home";
  if (/travel|luggage/.test(value)) return "travel";
  if (/beauty|skin|cosmetic/.test(value)) return "beauty";
  if (/sport|fitness|outdoor/.test(value)) return "sports";
  if (/book|stationery/.test(value)) return "book";
  if (/gift|toy|baby/.test(value)) return "gift";
  return "grid";
}
