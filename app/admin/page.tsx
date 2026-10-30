import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { PasswordInput } from "@/components/password-input";
import { RevenueOverviewChart, SixMonthSalesChart, OrderStatusDonut, type DailyMetric, type RevenueTrendMetric } from "@/components/admin-charts";
import { signIn } from "./actions";
import { getAdminSession, hasFeatureAccess } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

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
    if (hasFeatureAccess(session.access, "inventory")) redirect("/admin/inventory");
    if (hasFeatureAccess(session.access, "customers")) redirect("/admin/customers");
    if (hasFeatureAccess(session.access, "marketing")) redirect("/admin/discounts");
    if (hasFeatureAccess(session.access, "reports")) redirect("/admin/reports");
    return <AdminShell active="overview" access={session.access}><div className="admin-content"><Notice tone="error">Your account has no dashboard features assigned. Ask your super admin for access.</Notice></div></AdminShell>;
  }
  const { access } = session;
  const dataClient = createServiceClient();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - 29);
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
  const previousStart = new Date(startDate);
  previousStart.setUTCDate(previousStart.getUTCDate() - 30);
  const [{ data: products, error: productsError }, { data: recentOrders, error: recentOrdersError }, { data: activityOrders, error: activityOrdersError }, { data: yearOrders, error: yearOrdersError }, { data: previousOrders, error: previousOrdersError }] = await Promise.all([
    dataClient.from("products").select("id,name,category,image_url,stock_quantity,is_active"),
    dataClient.from("orders").select("id,customer_email,customer_id,total_pesewas,status,created_at").order("created_at", { ascending: false }).limit(6),
    dataClient.from("orders").select("total_pesewas,created_at,status,items,customer_email").gte("created_at", startDate.toISOString()).order("created_at", { ascending: false }).limit(1000),
    dataClient.from("orders").select("total_pesewas,created_at,status,customer_email").gte("created_at", yearStart.toISOString()).order("created_at", { ascending: true }).limit(5000),
    dataClient.from("orders").select("total_pesewas,status,customer_email").gte("created_at", previousStart.toISOString()).lt("created_at", startDate.toISOString()).limit(1000),
  ]);
  const catalog = products ?? [];
  const orders = recentOrders ?? [];
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
  const monthly = new Map<string, RevenueTrendMetric>();
  const sixMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
  for (let index = 0; index < 6; index += 1) {
    const date = new Date(Date.UTC(sixMonthStart.getUTCFullYear(), sixMonthStart.getUTCMonth() + index, 1));
    const key = date.toISOString().slice(0, 7);
    monthly.set(key, { date: key, label: date.toLocaleDateString("en-GH", { month: "short", timeZone: "UTC" }), value: 0, count: 0, firstValue: 0, repeatValue: 0 });
  }
  const previousCustomerEmails = new Set((previousOrders ?? []).filter((order) => order.status !== "cancelled" && order.status !== "refunded").map((order) => order.customer_email.toLowerCase()));
  const firstSeenEmails = new Set(previousCustomerEmails);
  for (const order of yearOrders ?? []) {
    if (order.status === "cancelled" || order.status === "refunded") continue;
    const month = monthly.get(new Date(order.created_at).toISOString().slice(0, 7));
    const email = order.customer_email.toLowerCase();
    const amount = Number(order.total_pesewas);
    if (month) {
      month.value += amount;
      month.count += 1;
      if (firstSeenEmails.has(email)) month.repeatValue += amount;
      else month.firstValue += amount;
    }
    firstSeenEmails.add(email);
  }
  const currentOrders = (activityOrders ?? []).filter((order) => order.status !== "cancelled" && order.status !== "refunded");
  const previousValidOrders = (previousOrders ?? []).filter((order) => order.status !== "cancelled" && order.status !== "refunded");
  const currentCustomers = new Set(currentOrders.map((order) => order.customer_email.toLowerCase()));
  const previousCustomers = new Set(previousValidOrders.map((order) => order.customer_email.toLowerCase()));
  const previousOrderValue = previousValidOrders.reduce((sum, order) => sum + Number(order.total_pesewas), 0);
  const currentAverageOrder = currentOrders.length ? Math.round(orderValue30d / currentOrders.length) : 0;
  const previousAverageOrder = previousValidOrders.length ? Math.round(previousOrderValue / previousValidOrders.length) : 0;
  const productSales = new Map<string, { quantity: number; value: number }>();
  for (const order of activityOrders ?? []) {
    if (order.status === "cancelled" || order.status === "refunded") continue;
    for (const item of Array.isArray(order.items) ? order.items : []) {
      const name = String((item as { name?: unknown }).name ?? "");
      const quantity = Math.max(0, Number((item as { quantity?: unknown }).quantity) || 0);
      const value = Math.max(0, Number((item as { unit_price_pesewas?: unknown }).unit_price_pesewas) || 0) * quantity;
      const current = productSales.get(name) ?? { value: 0, quantity: 0 };
      productSales.set(name, { value: current.value + value, quantity: current.quantity + quantity });
    }
  }
  const productsByName = new Map(catalog.map((product) => [product.name.toLowerCase(), product]));
  const topProducts = Array.from(productSales.entries()).map(([name, stats]) => ({ name, ...stats, image: productsByName.get(name.toLowerCase())?.image_url ?? null })).sort((a, b) => b.quantity - a.quantity).slice(0, 4);
  const lowStockProducts = catalog.filter((product) => product.is_active && product.stock_quantity <= 5).sort((a, b) => a.stock_quantity - b.stock_quantity);
  const statusCounts = new Map<string, number>();
  for (const order of activityOrders ?? []) statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  const statusItems = [
    { label: "Delivered", count: statusCounts.get("delivered") ?? 0, color: "#235b93" },
    { label: "In progress", count: (statusCounts.get("processing") ?? 0) + (statusCounts.get("shipped") ?? 0) + (statusCounts.get("out_for_delivery") ?? 0), color: "#f4c542" },
    { label: "Pending", count: (statusCounts.get("pending") ?? 0) + (statusCounts.get("confirmed") ?? 0), color: "#67a3d2" },
    { label: "Cancelled", count: (statusCounts.get("cancelled") ?? 0) + (statusCounts.get("refunded") ?? 0), color: "#d9e2ec" },
  ];
  const pendingOrders = (statusCounts.get("pending") ?? 0) + (statusCounts.get("confirmed") ?? 0);
  const money = (pesewas: number) => `GH₵ ${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
  const trend = (current: number, previous: number) => previous ? `${current >= previous ? "↑" : "↓"} ${Math.abs((current - previous) / previous * 100).toFixed(1)}% vs previous 30 days` : current ? "↑ New activity this period" : "No activity this period";
  const returningOrderCount = currentOrders.filter((order) => previousCustomers.has(order.customer_email.toLowerCase())).length;
  const returningOrderShare = currentOrders.length ? Math.round(returningOrderCount / currentOrders.length * 100) : 0;
  const insightText = orderValue30d > previousOrderValue ? `Order value is up ${previousOrderValue ? `${((orderValue30d - previousOrderValue) / previousOrderValue * 100).toFixed(1)}%` : "with new activity"} compared with the previous 30 days.` : orderValue30d < previousOrderValue ? `Order value is down ${((previousOrderValue - orderValue30d) / previousOrderValue * 100).toFixed(1)}% compared with the previous 30 days.` : "Your store performance is up to date. New orders will appear here.";
  const systemNeedsAttention = Boolean(productsError || recentOrdersError || activityOrdersError || yearOrdersError || previousOrdersError);
  const systemNotifications = [
    ...(systemNeedsAttention ? [{ tone: "warning", title: "Store data connection needs attention", detail: "Some product or order data could not be loaded. Check the Supabase connection and try again." }] : [{ tone: "healthy", title: "Store data is connected", detail: "Product and order records are loading normally." }]),
    ...(pendingOrders ? [{ tone: "notice", title: `${pendingOrders} orders need a status update`, detail: "Review pending and confirmed purchases in the Orders page." }] : []),
    ...((statusCounts.get("delivery_failed") ?? 0) ? [{ tone: "warning", title: `${statusCounts.get("delivery_failed")} deliveries need follow-up`, detail: "Check the affected orders and contact the buyer or delivery provider." }] : []),
    ...(lowStockProducts.length ? [{ tone: "warning", title: `${lowStockProducts.length} active products are low on stock`, detail: lowStockProducts.slice(0, 3).map((product) => `${product.name} (${product.stock_quantity} left)`).join(" · ") }] : []),
  ];
  const bestSellerAtRisk = topProducts.find((product) => (productsByName.get(product.name.toLowerCase())?.stock_quantity ?? 99) <= 5);
  const businessAdvice = systemNeedsAttention
    ? "Some dashboard data could not be loaded. Check the Supabase connection before acting on sales or stock recommendations."
    : bestSellerAtRisk
    ? `Restock ${bestSellerAtRisk.name}: it sold ${bestSellerAtRisk.quantity} ${bestSellerAtRisk.quantity === 1 ? "unit" : "units"} in the last 30 days and only ${productsByName.get(bestSellerAtRisk.name.toLowerCase())?.stock_quantity ?? 0} remain.`
    : pendingOrders >= 3
      ? `Work through the ${pendingOrders} pending or confirmed orders before launching a new promotion; faster fulfillment helps protect customer trust.`
      : returningOrderShare < 20 && currentOrders.length >= 5 && topProducts[0]
        ? `Returning order share is ${returningOrderShare}%. Feature ${topProducts[0].name} in a customer follow-up offer to encourage a second purchase.`
        : topProducts.length >= 2
          ? `Bundle ${topProducts[0].name} with ${topProducts[1].name}; both are selling now, so the pairing can raise basket value without relying on an untested product.`
          : lowStockProducts.length
            ? `Prioritize replenishing ${lowStockProducts.slice(0, 2).map((product) => product.name).join(" and ")}; active listings with only a few units can sell out between stock checks.`
            : catalog.some((product) => product.is_active)
              ? "No product has enough recent sales data for a reliable recommendation yet. Keep stock counts current; the advice will become more specific as orders accumulate."
              : "Publish an active product with a current stock count to begin generating useful store performance advice.";
  const { data: recentAdminActivity, error: activityLogError } = access.role === "super_admin"
    ? await dataClient.from("admin_activity_logs").select("id,actor_email,action,summary,created_at").order("created_at", { ascending: false }).limit(6)
    : { data: null, error: null };
  return <AdminShell active="overview" access={access}><div className="admin-content admin-overview-content"><div className="admin-page-title overview-title"><div><p className="admin-kicker">STORE OVERVIEW <span className={`system-health-pill ${systemNeedsAttention ? "attention" : "healthy"}`}>{systemNeedsAttention ? "Review needed" : "All systems operational"}</span></p><h1>Welcome back{access.displayName ? `, ${access.displayName.split(" ")[0]}` : ""}.</h1><p>Your store at a glance. Review today’s activity and keep things moving.</p></div><div className="overview-title-actions"><span className="overview-date">{new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>{hasFeatureAccess(access, "products") && <Link className="admin-primary-button" href="/admin/products/new">＋ Add product</Link>}</div></div>
    <section className="overview-quick-actions" aria-label="Quick actions"><div className="overview-quick-intro"><span>WORKSPACE</span><b>Quick actions</b><small>Jump into your next task</small></div>{hasFeatureAccess(access, "orders") && <Link href="/admin/orders"><i className="quick-action-icon orders">▤</i><span><b>Manage orders</b><small>{pendingOrders ? `${pendingOrders} waiting for review` : "View order activity"}</small></span><em>↗</em></Link>}{hasFeatureAccess(access, "products") && <Link href="/admin/products/new"><i className="quick-action-icon products">＋</i><span><b>Add a product</b><small>Grow your catalog</small></span><em>↗</em></Link>}{hasFeatureAccess(access, "inventory") && <Link href="/admin/inventory"><i className="quick-action-icon inventory">▥</i><span><b>Check inventory</b><small>{lowStockProducts.length ? `${lowStockProducts.length} low-stock items` : "Review stock levels"}</small></span><em>↗</em></Link>}{hasFeatureAccess(access, "reports") && <Link href="/admin/reports"><i className="quick-action-icon reports">▧</i><span><b>View reports</b><small>Explore store performance</small></span><em>↗</em></Link>}{access.role === "super_admin" && <Link href="/admin/team"><i className="quick-action-icon team">♧</i><span><b>Team access</b><small>Manage administrators</small></span><em>↗</em></Link>}</section>
    <section className="overview-kpi-grid">
      <article><span className="overview-kpi-symbol revenue">₵</span><div className="overview-kpi-copy"><small>Total order value</small><b>{money(orderValue30d)}</b><i>{trend(orderValue30d, previousOrderValue)}</i></div><span className="overview-kpi-spark">↗</span></article>
      <article><span className="overview-kpi-symbol orders">▤</span><div className="overview-kpi-copy"><small>Total orders</small><b>{currentOrders.length.toLocaleString("en-GH")}</b><i>{trend(currentOrders.length, previousValidOrders.length)}</i></div><span className="overview-kpi-spark green">↗</span></article>
      <article><span className="overview-kpi-symbol customers">♙</span><div className="overview-kpi-copy"><small>Total customers</small><b>{currentCustomers.size.toLocaleString("en-GH")}</b><i>{trend(currentCustomers.size, previousCustomers.size)}</i></div><span className="overview-kpi-spark yellow">↗</span></article>
      <article><span className="overview-kpi-symbol average">▱</span><div className="overview-kpi-copy"><small>Average order</small><b>{money(currentAverageOrder)}</b><i>{trend(currentAverageOrder, previousAverageOrder)}</i></div><span className="overview-kpi-spark">↗</span></article>
    </section>
    <div className="overview-analytics-grid"><div className="overview-chart-main"><RevenueOverviewChart data={Array.from(monthly.values())} /></div><div className="overview-insights-column"><section className="overview-analytics-summary"><div className="overview-module-title"><h2>Analytics</h2><span className="overview-period">ⓘ</span><span className="overview-period select-look">LAST 6 MONTHS⌄</span></div><div className="overview-analytics-metrics"><div><small>Orders awaiting action</small><b>{pendingOrders.toLocaleString("en-GH")}</b></div><div><small>Returning order share</small><b>{returningOrderShare}% <i>of orders</i></b></div></div><SixMonthSalesChart data={Array.from(monthly.values()).map(({ date, label, value, count }) => ({ date, label, value, count }))} /></section></div></div>
    <div className="overview-lower-grid">
      {hasFeatureAccess(access, "orders") && <section className="overview-lower-card overview-transactions"><div className="overview-module-title"><h2>Recent transactions</h2><Link href="/admin/orders">View all →</Link></div>{orders.length ? <div className="overview-transactions-list">{orders.slice(0, 4).map((order) => <article key={order.id}><span className={`overview-payment-icon ${order.status === "delivered" ? "success" : order.status === "cancelled" ? "cancelled" : "pending"}`}>{order.status === "delivered" ? "✓" : order.status === "cancelled" ? "×" : "₵"}</span><div className="overview-transaction-customer"><b>{order.customer_email}</b><small>{order.customer_id ? "Account order" : "Guest checkout"} · {new Date(order.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}</small></div><div className="overview-transaction-total"><b>{money(Number(order.total_pesewas))}</b><small className={`transaction-status ${order.status}`}>{order.status.replaceAll("_", " ")}</small></div></article>)}</div> : <div className="admin-orders-empty">Your transactions will appear here.</div>}{hasFeatureAccess(access, "orders") && <Link className="overview-transactions-footer" href="/admin/orders">View all transactions <span>→</span></Link>}</section>}
      {hasFeatureAccess(access, "products") && <section className="overview-lower-card overview-top-products"><div className="overview-module-title"><h2>Top products</h2><Link href="/admin/reports">View all</Link></div>{topProducts.length ? <div className="overview-product-list">{topProducts.map((product, index) => <article key={product.name}><span className="overview-product-thumb">{product.image ? <img src={product.image} alt=""/> : <b>{product.name.slice(0, 1).toUpperCase()}</b>}</span><div><b>{product.name}</b><small>{product.quantity.toLocaleString("en-GH")} sold · {money(product.value)}</small></div><span className={`overview-product-rank rank-${index + 1}`}>#{index + 1}</span></article>)}</div> : <div className="admin-orders-empty">Best sellers appear after orders come in.</div>}</section>}
      <div className="overview-lower-card overview-source-card"><OrderStatusDonut data={statusItems}/></div>
    </div>
    <div className="overview-operations-grid"><section className="overview-lower-card overview-system-card"><div className="overview-module-title"><h2>System notifications</h2><span className={`system-health-pill ${systemNeedsAttention ? "attention" : "healthy"}`}>{systemNeedsAttention ? "Needs attention" : "Operational"}</span></div><div className="overview-system-notices">{systemNotifications.map((notice, index) => <article key={`${notice.title}-${index}`}><i className={notice.tone}/><div><b>{notice.title}</b><p>{notice.detail}</p></div></article>)}</div></section><section className="overview-lower-card overview-advice-card"><div className="overview-module-title"><h2>Business advice</h2><span className="advice-mark">✦</span></div><p>{businessAdvice}</p>{hasFeatureAccess(access, "reports") && <Link href="/admin/reports">Review sales report →</Link>}</section></div>
    {access.role === "super_admin" && <section className="overview-lower-card admin-activity-preview"><div className="overview-module-title"><div><p className="admin-kicker">SUPER ADMIN OVERSIGHT</p><h2>Admin activity</h2></div><Link href="/admin/activity">View full log →</Link></div>{activityLogError ? <p className="admin-orders-empty">Run <code>supabase/admin-profiles-activity.sql</code> in Supabase to enable activity logging.</p> : recentAdminActivity?.length ? <div className="admin-activity-list compact">{recentAdminActivity.map((log) => <article key={log.id}><span className="admin-activity-mark">{log.action === "sign_in" ? "↗" : log.action === "sign_out" ? "↙" : "•"}</span><div className="admin-activity-detail"><div><b>{log.actor_email}</b><span>{log.action.replaceAll("_", " ")}</span></div><p>{log.summary}</p><small>{new Date(log.created_at).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}</small></div></article>)}</div> : <p className="admin-orders-empty">Admin sign-ins and changes will appear here once recorded.</p>}</section>}
  </div></AdminShell>;
}

function AdminSetup() {
  return <div className="admin-gate"><Link href="/" className="wordmark admin-brand">antwi<span>+</span></Link><section className="admin-gate-card"><div className="admin-gate-mark">✳</div><p className="admin-kicker">ADMIN SETUP</p><h1>Connect your store.</h1><p>Add your Supabase project URL and publishable key to <code>.env.local</code>, then run the database setup file.</p><ol><li>Create a free Supabase project.</li><li>Copy <b>Project URL</b> and <b>Publishable key</b> into <code>.env.local</code>.</li><li>Run <code>supabase/schema.sql</code> in the Supabase SQL editor.</li></ol><Link className="admin-primary-button" href="/">Back to storefront</Link></section></div>;
}

function AdminLogin({ error, denied }: { error?: string; denied: boolean }) {
  return <div className="admin-gate"><Link href="/" className="wordmark admin-brand">antwi<span>+</span></Link><section className="admin-gate-card"><div className="admin-gate-mark">✳</div><p className="admin-kicker">ANTWIPLUS ADMIN</p><h1>Welcome back.</h1><p>Sign in with your store administrator account.</p>{denied && <Notice tone="error">This account does not have store admin access yet. Ask the project owner to assign the admin role.</Notice>}{error && <Notice tone="error">That email and password combination didn’t work. Try again.</Notice>}<form action={signIn} className="admin-login-form"><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>Password<PasswordInput name="password" autoComplete="current-password" required placeholder="Your password" /></label><button className="admin-primary-button" type="submit">Sign in <span>↗</span></button></form><Link className="admin-back-link" href="/">← Back to shop</Link></section></div>;
}
