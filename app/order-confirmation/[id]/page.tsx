import Link from "next/link";
import { ClearCartOnLoad } from "@/components/cart";
import { StoreFooter, StoreHeader } from "@/components/storefront";

export default async function OrderConfirmation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><StoreHeader /><main className="store-page-shell"><ClearCartOnLoad /><section className="confirmation-card"><span className="confirmation-mark">✓</span><p className="admin-kicker">THANK YOU FOR SHOPPING ANTWIPLUS</p><h1>Your order is in.</h1><p>We’ve received your cash-on-delivery order. Our team will contact you to confirm the delivery fee and arrange your delivery.</p><div className="confirmation-number">ORDER REFERENCE <b>#{id.slice(0, 8).toUpperCase()}</b></div><div className="confirmation-account"><b>Want to keep your orders together?</b><p>Create an optional account with the same email you used at checkout. Once you confirm that email, your guest orders will appear in your order history.</p><Link href="/account">Create an account or sign in ↗</Link></div><Link className="store-primary-button" href="/shop">Keep exploring <span>↗</span></Link></section></main><StoreFooter /></>;
}
