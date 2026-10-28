import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { StoreFooter, StoreHeader } from "@/components/storefront";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <><StoreHeader /><main className="store-page-shell"><p className="store-breadcrumb"><Link href="/">Home</Link> / <Link href="/cart">Your bag</Link> / Checkout</p><div className="store-page-heading"><p className="admin-kicker">ALMOST YOURS</p><h1>Checkout.</h1><p>Share your delivery details and we’ll take it from here.</p></div><CheckoutForm error={error} /></main><StoreFooter /></>;
}
