import Link from "next/link";
import type { ReactNode } from "react";
import { signIn, signOut, toggleProduct } from "./actions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type AdminPageProps = { searchParams: Promise<{ setup?: string; access?: string; error?: string; created?: string }> };

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  return <p className={`admin-notice ${tone}`} role="status">{children}</p>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const query = await searchParams;
  if (!isSupabaseConfigured()) return <AdminSetup />;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims as Record<string, unknown> | undefined;
  const appMetadata = claims?.app_metadata as Record<string, unknown> | undefined;
  if (appMetadata?.role !== "admin") return <AdminLogin error={query.error} denied={query.access === "denied" || Boolean(claims)} />;
  const [{ data: products }, { data: orders }] = await Promise.all([
    supabase.from("products").select("id,name,slug,category,price_pesewas,stock_quantity,is_active,created_at").order("created_at", { ascending: false }),
    supabase.from("orders").select("id,customer_email,total_pesewas,status,created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  const catalog = products ?? [];
  const orderList = orders ?? [];
  const activeCount = catalog.filter((product) => product.is_active).length;
  const money = (pesewas: number) => `GH₵ ${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
  const email = String(claims?.email ?? "Store admin");

  return <div className="admin-shell">
    <aside className="admin-sidebar"><Link href="/" className="wordmark admin-brand">antwi<span>+</span></Link><p className="admin-side-label">STORE MANAGEMENT</p><nav><a className="active" href="/admin">▦ <span>Overview</span></a><a href="#catalog">▣ <span>Products</span></a><a href="#orders">▤ <span>Orders</span></a></nav><div className="admin-sidebar-bottom"><span className="admin-avatar">{email.slice(0, 1).toUpperCase()}</span><div><b>{email}</b><small>Administrator</small></div><form action={signOut}><button className="signout-button" aria-label="Sign out">↗</button></form></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div><span>AntwiPlus /</span> Admin</div><a href="/" target="_blank">View storefront ↗</a></header>
      <div className="admin-content"><div className="admin-page-title"><div><p className="admin-kicker">WEDNESDAY, OCTOBER 28</p><h1>Good morning.</h1><p>Here’s what’s happening with your store today.</p></div><Link className="admin-primary-button" href="/admin/products/new">＋ Add product</Link></div>
        {query.created && <Notice tone="success">Product added and published to your storefront.</Notice>}
        <section className="admin-stats"><article><span>Products</span><b>{catalog.length}</b><small>{activeCount} live in your shop</small><i>▣</i></article><article><span>Orders</span><b>{orderList.length}</b><small>Recent orders</small><i>▤</i></article><article><span>Stock watch</span><b>{catalog.filter((product) => product.stock_quantity <= 5).length}</b><small>Items with 5 or fewer left</small><i>◷</i></article><article><span>Order revenue</span><b>{money(orderList.reduce((sum, order) => sum + Number(order.total_pesewas), 0))}</b><small>Recent orders shown</small><i>↗</i></article></section>
        <section className="admin-panel" id="catalog"><div className="admin-panel-heading"><div><p className="admin-kicker">YOUR CATALOG</p><h2>Products</h2></div><Link href="/admin/products/new" className="admin-secondary-button">Add a product <span>↗</span></Link></div>
          {catalog.length === 0 ? <div className="admin-empty"><span>✳</span><h3>Your catalog is ready for its first product.</h3><p>Add an item and it will appear in the storefront.</p><Link className="admin-primary-button" href="/admin/products/new">＋ Add your first product</Link></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th /></tr></thead><tbody>{catalog.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>/{product.slug}</small></td><td>{product.category}</td><td>{money(Number(product.price_pesewas))}</td><td>{product.stock_quantity}</td><td><span className={`status-pill ${product.is_active ? "live" : "draft"}`}>{product.is_active ? "Live" : "Hidden"}</span></td><td><form action={toggleProduct}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="is_active" value={String(product.is_active)} /><button className="table-action">{product.is_active ? "Hide" : "Publish"}</button></form></td></tr>)}</tbody></table></div>}
        </section>
        <section className="admin-panel orders-panel" id="orders"><div className="admin-panel-heading"><div><p className="admin-kicker">LATEST ACTIVITY</p><h2>Recent orders</h2></div></div>{orderList.length === 0 ? <div className="admin-orders-empty">No orders yet. When a customer checks out, their order will show here.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>{orderList.map((order) => <tr key={order.id}><td><b>#{order.id.slice(0, 8).toUpperCase()}</b></td><td>{order.customer_email}</td><td>{new Date(order.created_at).toLocaleDateString("en-GH")}</td><td>{money(Number(order.total_pesewas))}</td><td><span className={`status-pill ${order.status === "paid" ? "live" : "draft"}`}>{order.status}</span></td></tr>)}</tbody></table></div>}</section>
      </div>
    </main>
  </div>;
}

function AdminSetup() {
  return <div className="admin-gate"><Link href="/" className="wordmark admin-brand">antwi<span>+</span></Link><section className="admin-gate-card"><div className="admin-gate-mark">✳</div><p className="admin-kicker">ADMIN SETUP</p><h1>Connect your store.</h1><p>Add your Supabase project URL and publishable key to <code>.env.local</code>, then run the database setup file.</p><ol><li>Create a free Supabase project.</li><li>Copy <b>Project URL</b> and <b>Publishable key</b> into <code>.env.local</code>.</li><li>Run <code>supabase/schema.sql</code> in the Supabase SQL editor.</li></ol><Link className="admin-primary-button" href="/">Back to storefront</Link></section></div>;
}

function AdminLogin({ error, denied }: { error?: string; denied: boolean }) {
  return <div className="admin-gate"><Link href="/" className="wordmark admin-brand">antwi<span>+</span></Link><section className="admin-gate-card"><div className="admin-gate-mark">✳</div><p className="admin-kicker">ANTWIPLUS ADMIN</p><h1>Welcome back.</h1><p>Sign in with your store administrator account.</p>{denied && <Notice tone="error">This account does not have store admin access yet. Ask the project owner to assign the admin role.</Notice>}{error && <Notice tone="error">That email and password combination didn’t work. Try again.</Notice>}<form action={signIn} className="admin-login-form"><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Your password" /></label><button className="admin-primary-button" type="submit">Sign in <span>↗</span></button></form><Link className="admin-back-link" href="/">← Back to shop</Link></section></div>;
}
