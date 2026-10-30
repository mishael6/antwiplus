import { AdminShell } from "@/components/admin-shell";
import { PasswordInput } from "@/components/password-input";
import { requireAdmin } from "@/lib/admin";
import { changeAdminPassword, updateAdminProfile } from "../actions";

export default async function AdminAccountPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string; force?: string; profileSaved?: string; profileError?: string }> }) {
  const { access } = await requireAdmin(undefined, { allowPasswordChange: true });
  const query = await searchParams;
  const errors: Record<string, string> = {
    length: "Use a password between 10 and 128 characters.", mismatch: "The new password fields do not match.",
    current: "The current password is incorrect.", update: "We couldn’t update your password. Please try again.", flag: "Password changed, but the temporary-password requirement could not be cleared. Please contact the super admin.",
  };
  const profileErrors: Record<string, string> = { invalid: "Add a display name and keep the phone number under 32 characters.", photo: "Choose a JPG, PNG, or WebP photo under 2 MB.", upload: "We couldn’t upload that photo. Please try again.", save: "We couldn’t save your profile. Please try again." };
  return <AdminShell active="account" access={access}><div className="admin-content new-product-content">
    <div className="admin-page-title"><div><p className="admin-kicker">YOUR DASHBOARD ACCOUNT</p><h1>Profile & security.</h1><p>Keep your administrator profile and sign-in details up to date.</p></div></div>
    {query.force && access.mustChangePassword && <p className="admin-notice info" role="status">This temporary password must be changed before you can access the dashboard.</p>}
    {query.success && <p className="admin-notice success" role="status">Your password has been changed.</p>}
    {query.error && <p className="admin-notice error" role="alert">{errors[query.error] ?? "Password change failed."}</p>}
    {query.profileSaved && <p className="admin-notice success" role="status">Your profile has been updated.</p>}
    {query.profileError && <p className="admin-notice error" role="alert">{profileErrors[query.profileError] ?? "Could not update your profile."}</p>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">PROFILE DETAILS</p><h2>How your team sees you</h2></div></div>
      <form action={updateAdminProfile} className="admin-profile-form" encType="multipart/form-data"><div className="admin-profile-preview">{access.avatarUrl ? <img src={access.avatarUrl} alt="Your profile"/> : <span>{(access.displayName || access.email).slice(0, 1).toUpperCase()}</span>}<div><b>Profile photo</b><small>JPG, PNG, or WebP · up to 2 MB</small><label className="admin-secondary-button" htmlFor="admin-avatar">Choose photo</label><input id="admin-avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" /></div></div>
        <label>Display name<input name="display_name" defaultValue={access.displayName ?? access.email.split("@")[0]} required maxLength={80}/></label><label>Phone number<input name="phone" type="tel" defaultValue={access.phone ?? ""} maxLength={32} placeholder="Optional"/></label><label>Dashboard email<input value={access.email} readOnly/><small>Ask your super admin if your login email needs to change.</small></label><div className="admin-profile-actions"><button className="admin-primary-button" type="submit">Save profile <span>↗</span></button></div>
      </form>
    </section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">ACCOUNT SECURITY</p><h2>Change password</h2><small>{access.email}</small></div></div>
      <form action={changeAdminPassword} className="password-change-form"><label>Current password<PasswordInput name="current_password" autoComplete="current-password" required /></label><label>New password<PasswordInput name="new_password" autoComplete="new-password" minLength={10} maxLength={128} required /><small>Use at least 10 characters.</small></label><label>Confirm new password<PasswordInput name="confirm_password" autoComplete="new-password" minLength={10} maxLength={128} required /></label><button className="admin-primary-button" type="submit">Change password <span>↗</span></button></form>
    </section>
  </div></AdminShell>;
}
