"use client";

import { useActionState } from "react";
import { trackGuestOrder, type TrackedOrder, type TrackingState } from "@/app/track-order/actions";

const statusLabels: Record<string, string> = {
  pending: "Order received", confirmed: "Order confirmed", paid: "Payment received", processing: "Preparing your order",
  shipped: "Handed to the courier", out_for_delivery: "Out for delivery", delivered: "Delivered",
  delivery_failed: "Delivery attempt needs attention", cancelled: "Cancelled", refunded: "Refunded",
};

function OrderProgress({ order }: { order: TrackedOrder }) {
  return <section className="guest-tracking-result" aria-live="polite">
    <div className="guest-tracking-header"><div><p className="admin-kicker">ORDER {order.reference}</p><h2>{statusLabels[order.status] ?? order.status}</h2></div><span className={`status-pill ${order.status === "delivered" ? "live" : "draft"}`}>{statusLabels[order.status] ?? order.status}</span></div>
    <p className="tracking-placed-date">Placed {new Date(order.created_at).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}</p>
    {(order.carrier || order.tracking_code || order.tracking_url) && <div className="tracking-carrier">{order.carrier && <b>{order.carrier}</b>}{order.tracking_code && <span>Tracking number: <b>{order.tracking_code}</b></span>}{order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer">Open courier tracking ↗</a>}</div>}
    <ol className="tracking-timeline">{order.events.map((event, index) => <li className={index === order.events.length - 1 ? "current" : ""} key={`${event.status}-${event.created_at}`}><span className="tracking-dot" /><div><b>{statusLabels[event.status] ?? event.status}</b>{event.note && <p>{event.note}</p>}<time>{new Date(event.created_at).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}</time></div></li>)}</ol>
    <p className="tracking-help">Need a hand? <a href="/contact">Contact AntwiPlus support</a> and include your order reference.</p>
  </section>;
}

export function GuestOrderTracker() {
  const [state, formAction, pending] = useActionState(trackGuestOrder, { error: null, order: null } satisfies TrackingState);
  return <div className="guest-tracker-layout"><form action={formAction} className="guest-tracker-form">
    <label>Order reference<input name="reference" required placeholder="AP-1234ABCD5678EF90" autoCapitalize="characters" autoComplete="off" /></label>
    <label>Email used at checkout<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
    <label>Phone number used at checkout<input name="phone" type="tel" required autoComplete="tel" placeholder="024 000 0000" /></label>
    {state.error === "not_found" && <p className="checkout-error" role="alert">We couldn’t find an order with those details. Check them and try again.</p>}
    {state.error === "rate_limited" && <p className="checkout-error" role="alert">Too many attempts. Please wait 15 minutes before trying again.</p>}
    {state.error === "service" && <p className="checkout-error" role="alert">Tracking is temporarily unavailable. Please try again later.</p>}
    <button className="store-primary-button full-button" disabled={pending} type="submit">{pending ? "Looking up your order…" : "Track my order"} <span>↗</span></button>
    <small>We use these details only to find your order. Your delivery address and other personal details are not shown here.</small>
  </form>{state.order && <OrderProgress order={state.order} />}</div>;
}
