import { AdminShell } from "@/components/admin-shell";
import { requireSuperAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

export default async function AdminActivityPage() {
  const { access } = await requireSuperAdmin();
  const { data: logs, error } = await createServiceClient().from("admin_activity_logs").select("id,actor_email,action,entity_type,entity_id,summary,created_at").order("created_at", { ascending: false }).limit(200);
  return <AdminShell active="activity" access={access}><div className="admin-content">
    <div className="admin-page-title"><div><p className="admin-kicker">ADMIN OVERSIGHT</p><h1>Activity log.</h1><p>Recent sign-ins and changes made across the admin dashboard.</p></div></div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">LATEST EVENTS</p><h2>Administrator activity</h2></div><span className="status-pill live">Last 200 events</span></div>
      {error ? <div className="admin-notice error" role="alert">Activity logging isn’t set up yet. Run <code>supabase/admin-profiles-activity.sql</code> in your Supabase SQL editor, then refresh this page.</div> : logs?.length ? <div className="admin-activity-list">{logs.map((log) => <article key={log.id}><span className="admin-activity-mark">{log.action === "sign_in" ? "↗" : log.action === "sign_out" ? "↙" : "•"}</span><div className="admin-activity-detail"><div><b>{log.actor_email}</b><span>{log.action.replaceAll("_", " ")}</span></div><p>{log.summary}</p><small>{new Date(log.created_at).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}</small></div><span className="admin-activity-type">{log.entity_type.replaceAll("_", " ")}</span></article>)}</div> : <div className="admin-orders-empty">No admin activity has been recorded yet. Sign-ins and dashboard changes will appear here.</div>}
    </section>
  </div></AdminShell>;
}
