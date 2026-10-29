import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin";

export default async function AdminOrdersPage() {
  const { supabase, access } = await requireAdmin("orders");
  const { data } = await supabase.from("orders").select("id,customer_email,total_pesewas,status,created_at").order("created_at", { ascending: false }).limit(100);
  const orders = data ?? [];

  const money = (pesewas: number) => `GH₵ ${(Number(pesewas) / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
  return <AdminShell active="orders" access={access}><div className="admin-content"><div className="admin-page-title"><div><p className="admin-kicker">CUSTOMER ACTIVITY</p><h1>Orders.</h1><p>Review the latest customer orders for your store.</p></div></div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">LATEST {orders.length} ORDERS</p><h2>All orders</h2></div></div>
      {orders.length === 0 ? <div className="admin-orders-empty">No orders yet. Customer orders will appear here.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b>#{order.id.slice(0, 8).toUpperCase()}</b></td><td>{order.customer_email}</td><td>{new Date(order.created_at).toLocaleDateString("en-GH")}</td><td>{money(order.total_pesewas)}</td><td><span className={`status-pill ${order.status === "paid" ? "live" : "draft"}`}>{order.status}</span></td></tr>)}</tbody></table></div>}
    </section><p className="admin-page-footnote"><Link href="/admin">← Back to overview</Link></p>
  </div></AdminShell>;
}
