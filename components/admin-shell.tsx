import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/admin/actions";
import type { AdminAccess, AdminFeature } from "@/lib/admin";

type AdminSection = AdminFeature | "team" | "account" | "settings" | "activity";

export function AdminShell({ children, active, access }: { children: ReactNode; active: AdminSection; access: AdminAccess }) {
  const sectionTitle = active === "marketing" ? "Discounts" : active === "settings" ? "Store settings" : active === "activity" ? "Activity log" : active[0].toUpperCase() + active.slice(1);
  const canSee = (feature: AdminFeature) => access.role === "super_admin" || access.permissions.includes(feature);
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Link href="/" className="wordmark admin-brand">antwi<span>+</span></Link><p className="admin-side-label">STORE MANAGEMENT</p>
      <nav aria-label="Admin navigation">{canSee("overview") && <Link aria-label="Overview" className={active === "overview" ? "active" : ""} href="/admin">▦ <span>Overview</span></Link>}{canSee("products") && <Link aria-label="Products" className={active === "products" ? "active" : ""} href="/admin/products">▣ <span>Products</span></Link>}{canSee("inventory") && <Link aria-label="Inventory" className={active === "inventory" ? "active" : ""} href="/admin/inventory">▥ <span>Inventory</span></Link>}{canSee("orders") && <Link aria-label="Orders" className={active === "orders" ? "active" : ""} href="/admin/orders">▤ <span>Orders</span></Link>}{canSee("customers") && <Link aria-label="Customers" className={active === "customers" ? "active" : ""} href="/admin/customers">♙ <span>Customers</span></Link>}{canSee("marketing") && <Link aria-label="Discounts" className={active === "marketing" ? "active" : ""} href="/admin/discounts">％ <span>Discounts</span></Link>}{canSee("reports") && <Link aria-label="Reports" className={active === "reports" ? "active" : ""} href="/admin/reports">▧ <span>Reports</span></Link>}{access.role === "super_admin" && <><Link aria-label="Activity log" className={active === "activity" ? "active" : ""} href="/admin/activity">◷ <span>Activity log</span></Link><Link aria-label="Team access" className={active === "team" ? "active" : ""} href="/admin/team">♧ <span>Team access</span></Link><Link aria-label="Store settings" className={active === "settings" ? "active" : ""} href="/admin/settings">⚙ <span>Store settings</span></Link></>}</nav>
      <div className="admin-sidebar-bottom"><Link href="/admin/account" className="admin-profile-link"><span className="admin-avatar">{access.avatarUrl ? <img src={access.avatarUrl} alt=""/> : (access.displayName || access.email).slice(0, 1).toUpperCase()}</span><div><b>{access.displayName || access.email.split("@")[0]}</b><small>{access.role === "super_admin" ? "Super admin" : "Administrator"}</small></div></Link><form action={signOut}><button className="signout-button" aria-label="Sign out">↗</button></form></div>
    </aside>
    <main className="admin-main"><header className="admin-topbar"><div><Link href="/admin">AntwiPlus</Link><span> / </span>{sectionTitle}</div><div className="admin-topbar-actions"><Link href="/admin/account">Account & password</Link><Link href="/" target="_blank">View storefront ↗</Link></div></header>{children}</main>
  </div>;
}
