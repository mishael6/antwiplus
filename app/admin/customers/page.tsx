import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

type Buyer = { email: string; name: string; phone: string; orders: { id: string; tracking_reference: string | null; total_pesewas: number; status: string; created_at: string }[]; total: number };
const money = (value: number) => `GH₵ ${(value / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ access }, query] = await Promise.all([requireAdmin("customers"), searchParams]);
  const { data, error } = await createServiceClient().from("orders").select("id,tracking_reference,customer_email,total_pesewas,status,created_at,delivery_address").order("created_at", { ascending: false }).limit(1000);
  const buyers = new Map<string, Buyer>();
  for (const order of data ?? []) {
    const email = String(order.customer_email ?? "").trim().toLowerCase();
    if (!email) continue;
    const address = order.delivery_address && typeof order.delivery_address === "object" ? order.delivery_address as Record<string, unknown> : {};
    let buyer = buyers.get(email);
    if (!buyer) {
      buyer = { email, name: String(address.full_name ?? "Guest buyer"), phone: String(address.phone ?? ""), orders: [], total: 0 };
      buyers.set(email, buyer);
    }
    buyer.orders.push({ id: order.id, tracking_reference: order.tracking_reference, total_pesewas: Number(order.total_pesewas), status: order.status, created_at: order.created_at });
    buyer.total += Number(order.total_pesewas);
  }
  const needle = (query.q ?? "").trim().toLowerCase();
  const list = Array.from(buyers.values()).filter((buyer) => !needle || `${buyer.email} ${buyer.name} ${buyer.phone}`.toLowerCase().includes(needle));
  const orderCount = list.reduce((sum, buyer) => sum + buyer.orders.length, 0);
  const totalSales = list.reduce((sum, buyer) => sum + buyer.total, 0);
  return <AdminShell active="customers" access={access}><div className="admin-content">
    <div className="admin-page-title"><div><p className="admin-kicker">CUSTOMER RELATIONSHIPS</p><h1>Customers.</h1><p>Understand who shops with you, their order history, and how much they’ve spent.</p></div></div>
    {error && <p className="admin-notice error" role="alert">Customer records could not be loaded.</p>}
    <section className="admin-stats"><article><span>Unique buyers</span><b>{buyers.size}</b><small>Guest and account orders</small><i>♙</i></article><article><span>Orders in view</span><b>{orderCount}</b><small>Up to the latest 1,000</small><i>▤</i></article><article><span>Order value</span><b>{money(totalSales)}</b><small>For customers shown</small><i>↗</i></article></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">BUYER DIRECTORY</p><h2>{list.length} customers</h2></div><form className="admin-search-form" action="/admin/customers"><label className="sr-only" htmlFor="customer-search">Search customers</label><input id="customer-search" name="q" defaultValue={query.q ?? ""} placeholder="Search email, name, phone" /><button className="admin-secondary-button" type="submit">Search</button></form></div>
      {list.length === 0 ? <div className="admin-orders-empty">{needle ? "No customers match that search." : "Customer records will appear after the first order."}</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>ORDERS</th><th>ORDER VALUE</th><th>LAST ORDER</th><th>HISTORY</th></tr></thead><tbody>{list.map((buyer) => <tr key={buyer.email}><td><b>{buyer.name}</b><small>{buyer.email}</small></td><td>{buyer.phone || "—"}</td><td>{buyer.orders.length}</td><td><b>{money(buyer.total)}</b></td><td>{new Date(buyer.orders[0].created_at).toLocaleDateString("en-GH")}</td><td><details className="customer-order-history"><summary>View orders</summary><ul>{buyer.orders.map((order) => <li key={order.id}><b>{order.tracking_reference ?? `#${order.id.slice(0, 8).toUpperCase()}`}</b><span>{new Date(order.created_at).toLocaleDateString("en-GH")} · {order.status} · {money(order.total_pesewas)}</span></li>)}</ul><a href={`mailto:${encodeURIComponent(buyer.email)}`}>Email customer ↗</a></details></td></tr>)}</tbody></table></div>}
    </section><p className="admin-page-footnote"><Link href="/admin/orders">Manage orders ↗</Link></p>
  </div></AdminShell>;
}
