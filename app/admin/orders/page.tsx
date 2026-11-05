import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { AdminOrderFulfillment } from "@/components/admin-order-fulfillment";
import { requireAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/date-format";

const statusLabels: Record<string, string> = { pending: "Order received", confirmed: "Confirmed", processing: "Preparing", shipped: "Shipped", out_for_delivery: "Out for delivery", delivered: "Delivered", delivery_failed: "Delivery issue", cancelled: "Cancelled", paid: "Paid", refunded: "Refunded" };
const statusClass = (status: string) => ["delivered", "paid"].includes(status) ? "complete" : ["cancelled", "refunded", "delivery_failed"].includes(status) ? "attention" : "progress";
const money = (pesewas: number) => `GH₵ ${(Number(pesewas) / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string; q?: string; view?: string }> }) {
  const { supabase, access } = await requireAdmin("orders");
  const [{ data }, query] = await Promise.all([
    supabase.from("orders").select("id,tracking_reference,customer_email,total_pesewas,status,created_at,tracking_carrier,tracking_code,tracking_url").order("created_at", { ascending: false }).limit(100),
    searchParams,
  ]);
  const orders = data ?? [];
  const awaiting = orders.filter((order) => ["pending", "confirmed", "paid"].includes(order.status)).length;
  const inFulfillment = orders.filter((order) => ["processing", "shipped", "out_for_delivery"].includes(order.status)).length;
  const completed = orders.filter((order) => order.status === "delivered").length;
  const q = query.q?.trim().toLowerCase() ?? "";
  const view = query.view ?? "all";
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !q || [order.tracking_reference, order.customer_email, order.id].some((value) => String(value ?? "").toLowerCase().includes(q));
    const matchesView = view === "attention" ? ["pending", "confirmed", "paid", "delivery_failed"].includes(order.status)
      : view === "fulfillment" ? ["processing", "shipped", "out_for_delivery"].includes(order.status)
      : view === "completed" ? ["delivered", "cancelled", "refunded"].includes(order.status)
      : true;
    return matchesSearch && matchesView;
  });

  return <AdminShell active="orders" access={access}><div className="admin-content admin-orders-page">
    <div className="admin-page-title"><div><p className="admin-kicker">CUSTOMER ACTIVITY</p><h1>Orders.</h1><p>Manage purchases, delivery progress, and customer updates in one place.</p></div><Link className="admin-secondary-button orders-report-link" href="/admin/reports">View sales reports <span>↗</span></Link></div>
    {query.updated && <p className="admin-notice success" role="status">Order tracking details saved.</p>}
    {query.error && <p className="admin-notice error" role="alert">{query.error === "invalid" ? "Check the status and use a valid HTTPS tracking link." : "Could not update this order. Please try again."}</p>}

    <section className="orders-summary" aria-label="Order summary">
      <article><span className="orders-summary-icon total">▤</span><div><small>Recent orders</small><b>{orders.length}</b><span>Latest 100 orders</span></div></article>
      <article><span className="orders-summary-icon awaiting">◷</span><div><small>Awaiting action</small><b>{awaiting}</b><span>Received, confirmed, or paid</span></div></article>
      <article><span className="orders-summary-icon moving">↗</span><div><small>In fulfillment</small><b>{inFulfillment}</b><span>Being prepared or delivered</span></div></article>
      <article><span className="orders-summary-icon delivered">✓</span><div><small>Delivered</small><b>{completed}</b><span>Successfully completed</span></div></article>
    </section>

    <section className="admin-panel orders-list-panel">
      <div className="orders-list-heading"><div><p className="admin-kicker">ORDER MANAGEMENT</p><h2>All orders <span>{filteredOrders.length}</span></h2></div><form className="orders-search-form" action="/admin/orders"><input aria-label="Search orders" name="q" defaultValue={query.q} placeholder="Search order or customer"/><input type="hidden" name="view" value={view}/><button className="admin-secondary-button" type="submit">Search</button></form></div>
      <nav className="orders-filter-tabs" aria-label="Filter orders">
        {[{ key: "all", label: "All orders" }, { key: "attention", label: "Needs action" }, { key: "fulfillment", label: "In fulfillment" }, { key: "completed", label: "Completed" }].map((item) => <Link key={item.key} className={view === item.key ? "selected" : ""} href={`/admin/orders?view=${item.key}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`}>{item.label}</Link>)}
      </nav>
      {filteredOrders.length === 0 ? <div className="orders-empty-state"><span>▤</span><b>{orders.length ? "No orders match these filters" : "No orders yet"}</b><p>{orders.length ? "Try another search or select a different order view." : "New customer purchases will appear here."}</p>{(q || view !== "all") && <Link href="/admin/orders">Clear filters</Link>}</div> : <div className="admin-table-wrap orders-table-wrap"><table className="admin-table orders-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>PLACED</th><th>ORDER TOTAL</th><th>STATUS</th><th>FULFILLMENT</th></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id}>
        <td><div className="orders-reference"><b>{order.tracking_reference ?? `#${order.id.slice(0, 8).toUpperCase()}`}</b><small>{order.id.slice(0, 8).toUpperCase()}</small></div></td>
        <td><div className="orders-customer"><span>{order.customer_email.slice(0, 1).toUpperCase()}</span><b>{order.customer_email}</b></div></td>
        <td className="orders-date">{formatDate(order.created_at)}</td><td className="orders-total">{money(order.total_pesewas)}</td>
        <td><span className={`orders-status ${statusClass(order.status)}`}><i/>{statusLabels[order.status] ?? order.status.replaceAll("_", " ")}</span></td>
        <td><AdminOrderFulfillment order={order} /></td>
      </tr>)}</tbody></table></div>}
    </section>
  </div></AdminShell>;
}
