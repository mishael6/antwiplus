import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { ReportExportButton } from "@/components/report-export-button";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

const money = (value: number) => `GH₵ ${(value / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
const excluded = new Set(["cancelled", "refunded"]);

export default async function ReportsPage() {
  const { access } = await requireAdmin("reports");
  const since = new Date(); since.setDate(since.getDate() - 29); since.setHours(0, 0, 0, 0);
  const { data, error } = await createServiceClient().from("orders").select("id,tracking_reference,customer_email,status,items,total_pesewas,created_at").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(2000);
  const orders = data ?? [];
  const validOrders = orders.filter((order) => !excluded.has(order.status));
  const revenue = validOrders.reduce((sum, order) => sum + Number(order.total_pesewas), 0);
  const customers = new Set(validOrders.map((order) => String(order.customer_email).toLowerCase()));
  const productTotals = new Map<string, { quantity: number; value: number }>();
  const exportRows: { date: string; order: string; email: string; status: string; product: string; quantity: number; lineValue: number }[] = [];
  for (const order of validOrders) {
    for (const raw of Array.isArray(order.items) ? order.items : []) {
      const item = raw as Record<string, unknown>;
      const name = String(item.name ?? "Product");
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const lineValue = Number(item.unit_price_pesewas ?? 0) * quantity;
      const current = productTotals.get(name) ?? { quantity: 0, value: 0 };
      productTotals.set(name, { quantity: current.quantity + quantity, value: current.value + lineValue });
      exportRows.push({ date: new Date(order.created_at).toISOString().slice(0, 10), order: order.tracking_reference ?? order.id, email: order.customer_email, status: order.status, product: name, quantity, lineValue });
    }
  }
  const bestSellers = Array.from(productTotals.entries()).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
  const statusCounts = new Map<string, number>();
  for (const order of orders) statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  return <AdminShell active="reports" access={access}><div className="admin-content">
    <div className="admin-page-title"><div><p className="admin-kicker">STORE PERFORMANCE</p><h1>Reports.</h1><p>Sales, customer, and product performance for the last 30 days.</p></div><ReportExportButton rows={exportRows} /></div>
    {error && <p className="admin-notice error" role="alert">Sales data could not be loaded.</p>}
    <section className="admin-stats"><article><span>Order value</span><b>{money(revenue)}</b><small>Excludes cancelled and refunded orders</small><i>↗</i></article><article><span>Orders</span><b>{validOrders.length}</b><small>Orders placed in this period</small><i>▤</i></article><article><span>Average order</span><b>{validOrders.length ? money(Math.round(revenue / validOrders.length)) : money(0)}</b><small>Average value per order</small><i>◷</i></article><article><span>Customers</span><b>{customers.size}</b><small>Unique buyers in this period</small><i>♙</i></article></section>
    <div className="reports-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">TOP PERFORMERS</p><h2>Best-selling products</h2></div></div>{bestSellers.length ? <div className="report-ranking">{bestSellers.map((product, index) => <article key={product.name}><span className="report-rank">{String(index + 1).padStart(2, "0")}</span><div><b>{product.name}</b><small>{product.quantity} units sold</small></div><strong>{money(product.value)}</strong></article>)}</div> : <p className="admin-orders-empty">Product sales will appear after completed orders.</p>}</section>
      <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">FULFILLMENT OVERVIEW</p><h2>Order statuses</h2></div></div>{statusCounts.size ? <div className="report-status-list">{Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1]).map(([status, count]) => <div key={status}><span>{status.replaceAll("_", " ")}</span><b>{count}</b><i style={{ width: `${Math.max(6, Math.round(count / Math.max(1, orders.length) * 100))}%` }} /></div>)}</div> : <p className="admin-orders-empty">No orders in this period.</p>}</section></div>
    <section className="admin-panel report-latest"><div className="admin-panel-heading"><div><p className="admin-kicker">LATEST TRANSACTIONS</p><h2>Recent orders</h2></div><Link className="admin-secondary-button" href="/admin/orders">Open orders ↗</Link></div>{orders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>REFERENCE</th><th>DATE</th><th>CUSTOMER</th><th>STATUS</th><th>VALUE</th></tr></thead><tbody>{orders.slice(0, 10).map((order) => <tr key={order.id}><td><b>{order.tracking_reference ?? `#${order.id.slice(0, 8).toUpperCase()}`}</b></td><td>{new Date(order.created_at).toLocaleDateString("en-GH")}</td><td>{order.customer_email}</td><td><span className={`status-pill ${order.status === "delivered" ? "live" : "draft"}`}>{order.status.replaceAll("_", " ")}</span></td><td>{money(Number(order.total_pesewas))}</td></tr>)}</tbody></table></div> : <p className="admin-orders-empty">No orders placed in the last 30 days.</p>}</section>
  </div></AdminShell>;
}
