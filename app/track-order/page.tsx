import Link from "next/link";
import { GuestOrderTracker } from "@/components/guest-order-tracker";
import { StoreFooter, StoreHeader } from "@/components/storefront";

export default function TrackOrderPage() {
  return <><StoreHeader /><main className="store-page-shell track-order-page"><p className="store-breadcrumb"><Link href="/">Home</Link> / Track your order</p>
    <div className="store-page-heading"><p className="admin-kicker">DELIVERY UPDATES</p><h1>Your order, <em>on its way.</em></h1><p>Track a guest order without creating an account. Enter the reference from your confirmation and the contact details used at checkout.</p></div>
    <GuestOrderTracker />
  </main><StoreFooter /></>;
}
