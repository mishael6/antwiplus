import { AdminShell } from "@/components/admin-shell";
import { PasswordInput } from "@/components/password-input";
import { requireAdmin } from "@/lib/admin";
import { changeAdminPassword } from "../actions";

export default async function AdminAccountPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string; force?: string }> }) {
  const { access } = await requireAdmin(undefined, { allowPasswordChange: true });
  const query = await searchParams;
  const errors: Record<string, string> = {
    length: "Use a password between 10 and 128 characters.", mismatch: "The new password fields do not match.",
    current: "The current password is incorrect.", update: "We couldn’t update your password. Please try again.", flag: "Password changed, but the temporary-password requirement could not be cleared. Please contact the super admin.",
  };
  return <AdminShell active="account" access={access}><div className="admin-content new-product-content">
    <div className="admin-page-title"><div><p className="admin-kicker">YOUR LOGIN</p><h1>Account security.</h1><p>Change the password you use to access the AntwiPlus dashboard.</p></div></div>
    {query.force && access.mustChangePassword && <p className="admin-notice info" role="status">This temporary password must be changed before you can access the dashboard.</p>}
    {query.success && <p className="admin-notice success" role="status">Your password has been changed.</p>}
    {query.error && <p className="admin-notice error" role="alert">{errors[query.error] ?? "Password change failed."}</p>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">SIGNED IN AS</p><h2>{access.email}</h2></div></div>
      <form action={changeAdminPassword} className="password-change-form"><label>Current password<PasswordInput name="current_password" autoComplete="current-password" required /></label><label>New password<PasswordInput name="new_password" autoComplete="new-password" minLength={10} maxLength={128} required /><small>Use at least 10 characters.</small></label><label>Confirm new password<PasswordInput name="confirm_password" autoComplete="new-password" minLength={10} maxLength={128} required /></label><button className="admin-primary-button" type="submit">Change password <span>↗</span></button></form>
    </section>
  </div></AdminShell>;
}
