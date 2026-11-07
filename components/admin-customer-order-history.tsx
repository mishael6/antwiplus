"use client";

import { ArrowIcon } from "@/components/arrow-icon";

import { useRef } from "react";
import { formatDate } from "@/lib/date-format";

type CustomerOrder = { id: string; tracking_reference: string | null; total_pesewas: number; status: string; created_at: string };

const money = (value: number) => `GH₵ ${(value / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

export function AdminCustomerOrderHistory({ email, orders }: { email: string; orders: CustomerOrder[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="customer-history-trigger" onClick={() => dialogRef.current?.showModal()}>
      {orders.length} {orders.length === 1 ? "order" : "orders"}<span>View history <ArrowIcon /></span>
    </button>
    <dialog className="customer-history-dialog" ref={dialogRef} aria-labelledby="customer-history-title">
      <header><div><p className="admin-kicker">CUSTOMER ORDERS</p><h2 id="customer-history-title">Order history</h2><small>{email}</small></div><button type="button" className="customer-history-close" aria-label="Close order history" onClick={() => dialogRef.current?.close()}>×</button></header>
      <ul className="customer-history-list">{orders.map((order) => <li key={order.id}><div><b>{order.tracking_reference ?? `#${order.id.slice(0, 8).toUpperCase()}`}</b><small>{formatDate(order.created_at)}</small></div><div><strong>{money(order.total_pesewas)}</strong><span className={`customer-history-status ${["delivered", "paid"].includes(order.status) ? "complete" : ["cancelled", "refunded"].includes(order.status) ? "muted" : "progress"}`}>{order.status.replaceAll("_", " ")}</span></div></li>)}</ul>
      <footer><a href={`mailto:${encodeURIComponent(email)}`}>Email customer <ArrowIcon /></a><button type="button" className="admin-secondary-button" onClick={() => dialogRef.current?.close()}>Close</button></footer>
    </dialog>
  </>;
}
