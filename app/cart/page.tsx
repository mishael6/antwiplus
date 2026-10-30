import Link from "next/link";
import { CartPage } from "@/components/cart-page";
import { StoreFooter, StoreHeader } from "@/components/storefront";

export default function CartRoute() {
  return <><StoreHeader /><main className="store-page-shell"><p className="store-breadcrumb"><Link href="/">Home</Link> / Cart</p><div className="store-page-heading"><p className="admin-kicker">A GOOD FIND IS CLOSE</p><h1>Your cart.</h1></div><CartPage /></main><StoreFooter /></>;
}
