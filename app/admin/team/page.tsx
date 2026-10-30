import { AdminShell } from "@/components/admin-shell";
import { PasswordInput } from "@/components/password-input";
import { ADMIN_FEATURES, requireSuperAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { addAdmin, removeAdmin, resetAdminPassword, updateAdminPermissions } from "./actions";

const featureNames = { overview: "Overview", products: "Products", inventory: "Inventory", orders: "Orders", customers: "Customers", marketing: "Discounts", reports: "Reports" } as const;

export default async function AdminTeamPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const { access } = await requireSuperAdmin();
  const service = createServiceClient();
  const [{ data: staff, error: staffError }, query] = await Promise.all([
    service.from("admin_access").select("user_id,email,role,permissions,created_at,display_name,phone,avatar_path").order("created_at"),
    searchParams,
  ]);
  const staffWithPhotos = await Promise.all((staff ?? []).map(async (member) => {
    if (!member.avatar_path) return { ...member, avatarUrl: null as string | null };
    const { data } = await service.storage.from("admin-avatars").createSignedUrl(member.avatar_path, 3600);
    return { ...member, avatarUrl: data?.signedUrl ?? null };
  }));
  const errorText: Record<string, string> = {
    email: "Enter a valid email address.", password: "The password must be 10–128 characters.",
    exists: "That email is already registered. Choose a new dashboard email.", create: "The admin account could not be created. Check Supabase Auth settings and try again.",
    setup: "Admin management needs the Supabase secret key configured on the server.", save: "Could not save those permissions. Please try again.", remove: "Could not remove this administrator.",
    superadmin: "A super admin cannot be changed from this screen.",
    reset: "Could not reset this administrator’s password. Please try again.",
  };
  return <AdminShell active="team" access={access}><div className="admin-content">
    <div className="admin-page-title"><div><p className="admin-kicker">PEOPLE & PERMISSIONS</p><h1>Team access.</h1><p>Give each administrator access to only the dashboard areas they manage.</p></div></div>
    {query.success && <p className="admin-notice success" role="status">{query.success === "reset" ? "Temporary password set. The admin must change it at next sign-in." : "Team access saved."}</p>}
    {(query.error || staffError) && <p className="admin-notice error" role="alert">{errorText[query.error ?? ""] ?? "Could not load the admin team. Check the server configuration."}</p>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">DASHBOARD LOGIN</p><h2>Create an administrator account</h2></div></div>
      <p className="team-help">Set up a dedicated login email and temporary password, then share those credentials securely with the administrator. They can change the password after signing in.</p>
      <form action={addAdmin} className="team-add-form"><label>Dashboard email<input type="email" name="email" required placeholder="name@antwiplus.com" /><small>Use an email-style login. A real, reachable inbox is needed for password reset emails.</small></label><label>Temporary password<PasswordInput name="password" required minLength={10} maxLength={128} autoComplete="new-password" /><small>At least 10 characters. The administrator should change it after first sign-in.</small></label><fieldset><legend>Dashboard access</legend>{ADMIN_FEATURES.map((feature) => <label className="permission-option" key={feature}><input type="checkbox" name="permissions" value={feature} /> <span><b>{featureNames[feature]}</b><small>{feature === "overview" ? "View store performance and summaries" : feature === "products" ? "Manage catalog and descriptions" : feature === "inventory" ? "Review stock and update quantities" : feature === "orders" ? "Review orders and update delivery" : feature === "customers" ? "View customer and guest buyer history" : feature === "marketing" ? "Create and manage customer discount codes" : "View sales and product performance"}</small></span></label>)}</fieldset><button className="admin-primary-button" type="submit">Create admin login <span>↗</span></button></form>
    </section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">{staff?.length ?? 0} ACCOUNTS</p><h2>Administrators</h2></div></div>
      {staffError ? <p className="admin-orders-empty">Team list unavailable.</p> : <div className="team-list">{staffWithPhotos.map((member) => <article className="team-member" key={member.user_id}><div className="team-member-title"><span className="admin-avatar">{member.avatarUrl ? <img src={member.avatarUrl} alt=""/> : (member.display_name || member.email).slice(0, 1).toUpperCase()}</span><div><b>{member.display_name || member.email}</b><small>{member.role === "super_admin" ? "Super admin · full access" : `Administrator${member.phone ? ` · ${member.phone}` : ""}`}</small></div></div>{member.role === "super_admin" ? <span className="status-pill live">Full access</span> : <><form action={updateAdminPermissions} className="team-permissions"><input type="hidden" name="user_id" value={member.user_id} />{ADMIN_FEATURES.map((feature) => <label key={feature}><input type="checkbox" name="permissions" value={feature} defaultChecked={member.permissions.includes(feature)} /> {featureNames[feature]}</label>)}<button className="table-action" type="submit">Save access</button></form><form action={removeAdmin}><input type="hidden" name="user_id" value={member.user_id} /><button className="team-remove" type="submit">Remove admin access</button></form><details className="team-reset"><summary>Reset password</summary><form action={resetAdminPassword}><input type="hidden" name="user_id" value={member.user_id} /><label>Temporary password<PasswordInput name="password" minLength={10} maxLength={128} autoComplete="new-password" required /></label><small>They’ll need to change it at their next sign-in.</small><button className="table-action" type="submit">Set temporary password</button></form></details></>}</article>)}</div>}
    </section>
  </div></AdminShell>;
}
