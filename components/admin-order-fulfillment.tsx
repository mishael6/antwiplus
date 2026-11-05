"use client";

import { useRef } from "react";
import { updateOrderFulfillment } from "@/app/admin/actions";

const statuses = ["pending", "confirmed", "paid", "processing", "shipped", "out_for_delivery", "delivered", "delivery_failed", "cancelled", "refunded"] as const;
const statusLabels: Record<string, string> = { pending: "Order received", confirmed: "Confirmed", processing: "Preparing", shipped: "Shipped", out_for_delivery: "Out for delivery", delivered: "Delivered", delivery_failed: "Delivery issue", cancelled: "Cancelled", paid: "Paid", refunded: "Refunded" };

type FulfillmentOrder = {
  id: string;
  tracking_reference: string | null;
  customer_email: string;
  status: string;
  tracking_carrier: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
};

export function AdminOrderFulfillment({ order }: { order: FulfillmentOrder }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <>
    <button className="order-edit-trigger" type="button" onClick={() => dialogRef.current?.showModal()}>{order.tracking_code ? "Edit delivery" : "Update delivery"}<span>↗</span></button>
    <dialog className="order-fulfillment-dialog" ref={dialogRef} aria-labelledby={`fulfillment-title-${order.id}`}>
      <div className="order-dialog-heading"><div><p className="admin-kicker">ORDER FULFILLMENT</p><h2 id={`fulfillment-title-${order.id}`}>Update delivery</h2><small>{order.tracking_reference ?? `#${order.id.slice(0, 8).toUpperCase()}`} · {order.customer_email}</small></div><button className="order-dialog-close" type="button" aria-label="Close delivery editor" onClick={() => dialogRef.current?.close()}>×</button></div>
      <form action={updateOrderFulfillment} className="order-fulfillment-form">
        <input type="hidden" name="id" value={order.id} />
        <label>Order status<select name="status" defaultValue={statuses.includes(order.status as (typeof statuses)[number]) ? order.status : "pending"}>{statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label>
        <details className="fulfillment-optional" open={Boolean(order.tracking_carrier || order.tracking_code || order.tracking_url)}><summary>Courier details <small>Optional</small></summary><div><label>Delivery company<input name="tracking_carrier" defaultValue={order.tracking_carrier ?? ""} placeholder="e.g. AntwiPlus delivery" /></label><label>Tracking number<input name="tracking_code" defaultValue={order.tracking_code ?? ""} placeholder="Enter tracking number" /></label><label>Tracking link<input name="tracking_url" type="url" defaultValue={order.tracking_url ?? ""} placeholder="https://..." /></label></div></details>
        <div className="order-dialog-actions"><button className="admin-secondary-button" type="button" onClick={() => dialogRef.current?.close()}>Cancel</button><button className="admin-primary-button" type="submit">Save update <span>↗</span></button></div>
      </form>
    </dialog>
  </>;
}
