import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin";
import { updateOrderFulfillment } from "../actions";

const statuses = ["pending", "confirmed", "paid", "processing", "shipped", "out_for_delivery", "delivered", "delivery_failed", "cancelled", "refunded"] as const;
const statusLabels: Record<string, string> = { pending: "Order received", confirmed: "Confirmed", processing: "Preparing", shipped: "Shipped", out_for_delivery: "Out for delivery", delivered: "Delivered", delivery_failed: "Delivery issue", cancelled: "Cancelled", paid: "Paid", refunded: "Refunded" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  const { supabase, access } = await requireAdmin("orders");
  const [{ data }, query] = await Promise.all([
    supabase.from("orders").select("id,tracking_reference,customer_email,total_pesewas,status,created_at,tracking_carrier,tracking_code,tracking_url").order("created_at", { ascending: false }).limit(100),
    searchParams,
  ]);
  const orders = data ?? [];
  const money = (pesewas: number) => `GH₵ ${(Number(pesewas) / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
  return <AdminShell active="orders" access={access}><div className="admin-content"><div className="admin-page-title"><div><p className="admin-kicker">CUSTOMER ACTIVITY</p><h1>Orders.</h1><p>Review orders and update fulfillment progress for customer tracking.</p></div></div>
    {query.updated && <p className="admin-notice success" role="status">Order tracking details saved.</p>}
    {query.error && <p className="admin-notice error" role="alert">{query.error === "invalid" ? "Check the status and use a valid HTTPS tracking link." : "Could not update this order. Please try again."}</p>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">LATEST {orders.length} ORDERS</p><h2>All orders</h2></div></div>
      {orders.length === 0 ? <div className="admin-orders-empty">No orders yet. Customer orders will appear here.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>TOTAL</th><th>STATUS</th><th>FULFILLMENT</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}>
        <td><b>{order.tracking_reference ?? `#${order.id.slice(0, 8).toUpperCase()}`}</b></td><td>{order.customer_email}</td><td>{new Date(order.created_at).toLocaleDateString("en-GH")}</td><td>{money(order.total_pesewas)}</td><td><span className={`status-pill ${order.status === "delivered" ? "live" : "draft"}`}>{statusLabels[order.status] ?? order.status}</span></td>
        <td><details className="order-fulfillment"><summary>Update tracking</summary><form action={updateOrderFulfillment}><input type="hidden" name="id" value={order.id} /><label>Status<select name="status" defaultValue={statuses.includes(order.status as (typeof statuses)[number]) ? order.status : "pending"}>{statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label><label>Delivery company<input name="tracking_carrier" defaultValue={order.tracking_carrier ?? ""} placeholder="e.g. AntwiPlus delivery" /></label><label>Tracking number<input name="tracking_code" defaultValue={order.tracking_code ?? ""} placeholder="Optional" /></label><label>Tracking link<input name="tracking_url" type="url" defaultValue={order.tracking_url ?? ""} placeholder="https://..." /></label><button className="admin-primary-button" type="submit">Save tracking</button></form></details></td>
      </tr>)}</tbody></table></div>}
    </section><p className="admin-page-footnote"><Link href="/admin">← Back to overview</Link></p>
  </div></AdminShell>;
}
