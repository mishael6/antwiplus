import Link from "next/link";
import type { ReactNode } from "react";
import { StoreFooter, StoreHeader } from "@/components/storefront";

export function InfoPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <><StoreHeader /><main className="store-page-shell"><p className="store-breadcrumb"><Link href="/">Home</Link> / {title}</p><section className="info-page"><p className="admin-kicker">{eyebrow}</p><h1>{title}</h1><p className="info-intro">{intro}</p><div className="info-copy">{children}</div></section></main><StoreFooter /></>;
}
