import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/admin/actions";
import type { AdminAccess, AdminFeature } from "@/lib/admin";

type AdminSection = AdminFeature | "team" | "account";

export function AdminShell({ children, active, access }: { children: ReactNode; active: AdminSection; access: AdminAccess }) {
  const sectionTitle = active[0].toUpperCase() + active.slice(1);
  const canSee = (feature: AdminFeature) => access.role === "super_admin" || access.permissions.includes(feature);
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Link href="/" className="wordmark admin-brand">antwi<span>+</span></Link><p className="admin-side-label">STORE MANAGEMENT</p>
      <nav aria-label="Admin navigation">{canSee("overview") && <Link className={active === "overview" ? "active" : ""} href="/admin">▦ <span>Overview</span></Link>}{canSee("products") && <Link className={active === "products" ? "active" : ""} href="/admin/products">▣ <span>Products</span></Link>}{canSee("orders") && <Link className={active === "orders" ? "active" : ""} href="/admin/orders">▤ <span>Orders</span></Link>}{access.role === "super_admin" && <Link className={active === "team" ? "active" : ""} href="/admin/team">♙ <span>Team access</span></Link>}</nav>
      <div className="admin-sidebar-bottom"><span className="admin-avatar">{access.email.slice(0, 1).toUpperCase()}</span><div><b>{access.email}</b><small>{access.role === "super_admin" ? "Super admin" : "Administrator"}</small></div><form action={signOut}><button className="signout-button" aria-label="Sign out">↗</button></form></div>
    </aside>
    <main className="admin-main"><header className="admin-topbar"><div><Link href="/admin">AntwiPlus</Link><span> / </span>{sectionTitle}</div><div className="admin-topbar-actions"><Link href="/admin/account">Account & password</Link><Link href="/" target="_blank">View storefront ↗</Link></div></header>{children}</main>
  </div>;
}
