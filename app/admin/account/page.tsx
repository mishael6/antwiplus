import { ArrowIcon } from "@/components/arrow-icon";
import { AdminShell } from "@/components/admin-shell";
import { PasswordInput } from "@/components/password-input";
import { AdminAvatarUpload } from "@/components/admin-avatar-upload";
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
  const accessAreas = access.role === "super_admin" ? ["Full dashboard access"] : access.permissions.map((feature) => feature === "marketing" ? "Discounts" : feature.charAt(0).toUpperCase() + feature.slice(1));
  return <AdminShell active="account" access={access}><div className="admin-content admin-profile-page">
    <div className="admin-page-title"><div><p className="admin-kicker">YOUR DASHBOARD ACCOUNT</p><h1>Profile.</h1><p>Update how your team identifies you and keep your sign-in secure.</p></div><span className="profile-role-badge">{access.role === "super_admin" ? "Super admin" : "Administrator"}</span></div>
    {query.force && access.mustChangePassword && <p className="admin-notice info" role="status">This temporary password must be changed before you can access the dashboard.</p>}
    {query.success && <p className="admin-notice success" role="status">Your password has been changed.</p>}
    {query.error && <p className="admin-notice error" role="alert">{errors[query.error] ?? "Password change failed."}</p>}
    {query.profileSaved && <p className="admin-notice success" role="status">Your profile has been updated.</p>}
    {query.profileError && <p className="admin-notice error" role="alert">{profileErrors[query.profileError] ?? "Could not update your profile."}</p>}
    <div className="profile-layout">
      <section className="admin-panel profile-details-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">PROFILE DETAILS</p><h2>Personal information</h2><small>This name and photo appear in the dashboard.</small></div><span className="profile-panel-mark">♙</span></div>
        <form action={updateAdminProfile} className="admin-profile-form"><AdminAvatarUpload initialImageUrl={access.avatarUrl} fallback={(access.displayName || access.email).slice(0, 1).toUpperCase()} />
          <div className="profile-fields-grid"><label>Display name<input name="display_name" defaultValue={access.displayName ?? access.email.split("@")[0]} required maxLength={80}/></label><label>Phone number<input name="phone" type="tel" defaultValue={access.phone ?? ""} maxLength={32} placeholder="Optional"/></label><label className="profile-email-field">Dashboard email<input value={access.email} readOnly/><small>Ask your super admin to change this login email.</small></label></div><div className="admin-profile-actions"><button className="admin-primary-button" type="submit">Save profile <span><ArrowIcon /></span></button></div>
        </form>
      </section>
      <aside className="admin-panel profile-access-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">ACCESS SUMMARY</p><h2>Your dashboard access</h2></div></div><div className="profile-access-identity"><span className="admin-avatar">{access.avatarUrl ? <img src={access.avatarUrl} alt=""/> : (access.displayName || access.email).slice(0, 1).toUpperCase()}</span><div><b>{access.displayName || access.email.split("@")[0]}</b><small>{access.role === "super_admin" ? "Super admin" : "Administrator"}</small></div></div><p className="profile-access-label">Available sections</p><ul className="profile-access-list">{accessAreas.map((area) => <li key={area}><span>✓</span>{area}</li>)}</ul></aside>
    </div>
    <div className="profile-security-layout"><section className="admin-panel profile-security-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">ACCOUNT SECURITY</p><h2>Change password</h2><small>Choose a password you do not use on other websites.</small></div><span className="profile-panel-mark security">⌑</span></div>
        <form action={changeAdminPassword} className="password-change-form"><label>Current password<PasswordInput name="current_password" autoComplete="current-password" required /></label><label>New password<PasswordInput name="new_password" autoComplete="new-password" minLength={10} maxLength={128} required /><small>Use at least 10 characters.</small></label><label>Confirm new password<PasswordInput name="confirm_password" autoComplete="new-password" minLength={10} maxLength={128} required /></label><button className="admin-primary-button" type="submit">Update password <span><ArrowIcon /></span></button></form>
      </section><aside className="profile-security-note"><span>✓</span><div><b>Keep your account protected</b><p>Use a long, unique password. Your dashboard email is your sign-in name; contact the super admin if it needs to change.</p><small>Signed in as {access.email}</small></div></aside></div>
  </div></AdminShell>;
}
