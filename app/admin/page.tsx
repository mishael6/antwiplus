import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { PasswordInput } from "@/components/password-input";
import { OrderValueChart, OrderVolumeChart, type DailyMetric } from "@/components/admin-charts";
import { signIn } from "./actions";
import { getAdminSession, hasFeatureAccess } from "@/lib/admin";

type AdminPageProps = { searchParams: Promise<{ setup?: string; access?: string; error?: string }> };

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  return <p className={`admin-notice ${tone}`} role="status">{children}</p>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const query = await searchParams;
  const session = await getAdminSession();
  if (!session) return <AdminSetup />;
  if (!session.claims) return <AdminLogin error={query.error} denied={query.access === "denied"} />;
  if (!session.access) return <AdminLogin error={query.error} denied />;
  if (session.access.mustChangePassword) redirect("/admin/account?force=1");
  if (!hasFeatureAccess(session.access, "overview")) {
    if (hasFeatureAccess(session.access, "products")) redirect("/admin/products");
    if (hasFeatureAccess(session.access, "orders")) redirect("/admin/orders");
    return <AdminShell active="overview" access={session.access}><div className="admin-content"><Notice tone="error">Your account has no dashboard features assigned. Ask your super admin for access.</Notice></div></AdminShell>;
  }
  const { supabase, claims, access } = session;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - 29);
  const [{ data: products }, { data: recentOrders }, { data: activityOrders }, { count: orderCount }] = await Promise.all([
    supabase.from("products").select("id,stock_quantity,is_active"),
    supabase.from("orders").select("id,customer_email,total_pesewas,status,created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("orders").select("total_pesewas,created_at,status").gte("created_at", startDate.toISOString()).order("created_at", { ascending: false }).limit(1000),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);
  const catalog = products ?? [];
  const orders = recentOrders ?? [];
  const lowStock = catalog.filter((product) => product.stock_quantity <= 5).length;
  const daily = new Map<string, DailyMetric>();
  for (let index = 0; index < 30; index += 1) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    daily.set(key, { date: key, label: date.toLocaleDateString("en-GH", { month: "short", day: "numeric", timeZone: "UTC" }), value: 0, count: 0 });
  }
  for (const order of activityOrders ?? []) {
    if (order.status === "cancelled" || order.status === "refunded") continue;
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    const day = daily.get(key);
    if (day) { day.value += Number(order.total_pesewas); day.count += 1; }
  }
  const dailyMetrics = Array.from(daily.values());
  const orderValue30d = dailyMetrics.reduce((sum, day) => sum + day.value, 0);
  const money = (pesewas: number) => `GH₵ ${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
  return <AdminShell active="overview" access={access}><div className="admin-content"><div className="admin-page-title"><div><p className="admin-kicker">STORE PERFORMANCE</p><h1>Overview.</h1><p>Track order activity, catalog health, and recent performance.</p></div>{hasFeatureAccess(access, "products") && <Link className="admin-primary-button" href="/admin/products/new">＋ Add product</Link>}</div>
    <section className="admin-stats"><article><span>Products</span><b>{catalog.length}</b><small>{catalog.filter((product) => product.is_active).length} live in your shop</small><i>▣</i></article><article><span>Orders</span><b>{orderCount ?? 0}</b><small>All-time orders</small><i>▤</i></article><article><span>Stock watch</span><b>{lowStock}</b><small>Items with 5 or fewer left</small><i>◷</i></article><article><span>Order value · 30d</span><b>{money(orderValue30d)}</b><small>Placed orders, not collected revenue</small><i>↗</i></article></section>
    <div className="admin-charts-grid"><OrderValueChart data={dailyMetrics} /><OrderVolumeChart data={dailyMetrics} /></div>
    {hasFeatureAccess(access, "orders") && <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">LATEST ACTIVITY</p><h2>Recent orders</h2></div><Link className="admin-secondary-button" href="/admin/orders">View all orders <span>↗</span></Link></div>
      {orders.length === 0 ? <div className="admin-orders-empty">No orders yet. Customer orders will appear here.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b>#{order.id.slice(0, 8).toUpperCase()}</b></td><td>{order.customer_email}</td><td>{new Date(order.created_at).toLocaleDateString("en-GH")}</td><td>{money(Number(order.total_pesewas))}</td><td><span className={`status-pill ${order.status === "paid" ? "live" : "draft"}`}>{order.status}</span></td></tr>)}</tbody></table></div>}
    </section>}
    {(hasFeatureAccess(access, "products") || hasFeatureAccess(access, "orders")) && <section className="admin-panel admin-shortcuts"><div className="admin-panel-heading"><div><p className="admin-kicker">QUICK ACCESS</p><h2>Manage your store</h2></div></div><div className="admin-shortcut-grid">{hasFeatureAccess(access, "products") && <Link href="/admin/products"><span>▣</span><b>Manage products</b><small>Update prices, stock, and visibility</small><i>↗</i></Link>}{hasFeatureAccess(access, "orders") && <Link href="/admin/orders"><span>▤</span><b>Manage orders</b><small>Review customer purchases</small><i>↗</i></Link>}</div></section>}
  </div></AdminShell>;
}

function AdminSetup() {
  return <div className="admin-gate"><Link href="/" className="wordmark admin-brand">antwi<span>+</span></Link><section className="admin-gate-card"><div className="admin-gate-mark">✳</div><p className="admin-kicker">ADMIN SETUP</p><h1>Connect your store.</h1><p>Add your Supabase project URL and publishable key to <code>.env.local</code>, then run the database setup file.</p><ol><li>Create a free Supabase project.</li><li>Copy <b>Project URL</b> and <b>Publishable key</b> into <code>.env.local</code>.</li><li>Run <code>supabase/schema.sql</code> in the Supabase SQL editor.</li></ol><Link className="admin-primary-button" href="/">Back to storefront</Link></section></div>;
}

function AdminLogin({ error, denied }: { error?: string; denied: boolean }) {
  return <div className="admin-gate"><Link href="/" className="wordmark admin-brand">antwi<span>+</span></Link><section className="admin-gate-card"><div className="admin-gate-mark">✳</div><p className="admin-kicker">ANTWIPLUS ADMIN</p><h1>Welcome back.</h1><p>Sign in with your store administrator account.</p>{denied && <Notice tone="error">This account does not have store admin access yet. Ask the project owner to assign the admin role.</Notice>}{error && <Notice tone="error">That email and password combination didn’t work. Try again.</Notice>}<form action={signIn} className="admin-login-form"><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>Password<PasswordInput name="password" autoComplete="current-password" required placeholder="Your password" /></label><button className="admin-primary-button" type="submit">Sign in <span>↗</span></button></form><Link className="admin-back-link" href="/">← Back to shop</Link></section></div>;
}
