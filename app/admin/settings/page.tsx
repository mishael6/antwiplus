import { AdminShell } from "@/components/admin-shell";
import { requireSuperAdmin } from "@/lib/admin";
import { DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";
import { createServiceClient } from "@/lib/supabase/service";
import { saveStoreSettings } from "../actions";

export default async function StoreSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ access }, query] = await Promise.all([requireSuperAdmin(), searchParams]);
  const { data, error } = await createServiceClient().from("store_settings").select("announcement,delivery_note,support_email,support_phone").eq("id", true).maybeSingle();
  const settings = data ?? DEFAULT_STORE_SETTINGS;
  return <AdminShell active="settings" access={access}><div className="admin-content settings-content">
    <div className="admin-page-title"><div><p className="admin-kicker">STOREFRONT CONFIGURATION</p><h1>Store settings.</h1><p>Manage the customer-facing announcement and the contact details shoppers use to reach you.</p></div></div>
    {query.saved && <p className="admin-notice success" role="status">Store settings saved. The storefront is updated.</p>}{query.error && <p className="admin-notice error" role="alert">{query.error === "invalid" ? "Check the announcement, delivery note, and support contact details." : "We couldn’t save the store settings."}</p>}{error && <p className="admin-notice error" role="alert">Could not load settings. Run the store settings database setup first.</p>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">CUSTOMER-FACING DETAILS</p><h2>Storefront message and support</h2></div></div><form action={saveStoreSettings} className="settings-form"><label>Announcement banner<input name="announcement" maxLength={100} required defaultValue={settings.announcement} /><small>Shown across the top of every storefront page.</small></label><label>Delivery message<input name="delivery_note" maxLength={70} required defaultValue={settings.delivery_note} /><small>Appears beside your announcement.</small></label><div className="form-two-col"><label>Support email <span className="optional-label">OPTIONAL</span><input name="support_email" type="email" defaultValue={settings.support_email} /><small>Used by the Contact link in the storefront footer when added.</small></label><label>Support phone <span className="optional-label">OPTIONAL</span><input name="support_phone" type="tel" maxLength={40} defaultValue={settings.support_phone} /><small>When provided, a Call us link appears in the footer.</small></label></div><div className="settings-form-actions"><button className="admin-primary-button" type="submit">Save store settings <span>↗</span></button></div></form></section>
    <section className="admin-panel settings-note"><p className="admin-kicker">SUPER ADMIN ONLY</p><h2>Customer experience settings</h2><p>These details appear in the live store. Check spelling and phone formatting before saving.</p></section>
  </div></AdminShell>;
}
