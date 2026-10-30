import Link from "next/link";
import { ClearCartOnLoad } from "@/components/cart";
import { StoreFooter, StoreHeader } from "@/components/storefront";
import { createServiceClient } from "@/lib/supabase/service";
import { CopyOrderReference } from "@/components/copy-order-reference";
import { formatPrice } from "@/lib/currency";

export default async function OrderConfirmation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await createServiceClient().from("orders").select("tracking_reference,total_pesewas,discount_code,discount_pesewas").eq("id", id).maybeSingle();
  const reference = data?.tracking_reference ?? `#${id.slice(0, 8).toUpperCase()}`;
  return <><StoreHeader /><main className="store-page-shell"><ClearCartOnLoad /><section className="confirmation-card"><span className="confirmation-mark">✓</span><p className="admin-kicker">THANK YOU FOR SHOPPING ANTWIPLUS</p><h1>Your order is in.</h1><p>We’ve received your cash-on-delivery order. Our team will contact you to confirm the delivery fee and arrange your delivery.</p>{data && <div className="confirmation-total"><span>ORDER TOTAL</span><b>{formatPrice(Number(data.total_pesewas))}</b>{data.discount_code && <small>{data.discount_code} saved you {formatPrice(Number(data.discount_pesewas))}</small>}</div>}<div className="confirmation-number"><span>ORDER REFERENCE</span><div className="confirmation-reference-row"><b>{reference}</b><CopyOrderReference reference={reference} /></div></div><div className="confirmation-account"><b>Track your order anytime</b><p>Use this reference with the email address and phone number you entered at checkout. No account is needed.</p><Link href="/track-order">Track this order ↗</Link></div><Link className="store-primary-button" href="/shop">Keep exploring <span>↗</span></Link></section></main><StoreFooter /></>;
}
