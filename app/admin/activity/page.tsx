import { ArrowIcon } from "@/components/arrow-icon";
import { AdminShell } from "@/components/admin-shell";
import { requireSuperAdmin } from "@/lib/admin";
import { formatDateTime } from "@/lib/date-format";
import { createServiceClient } from "@/lib/supabase/service";

export default async function AdminActivityPage() {
  const { access } = await requireSuperAdmin();
  const { data: logs, error } = await createServiceClient().from("admin_activity_logs").select("id,actor_email,action,entity_type,entity_id,summary,created_at").order("created_at", { ascending: false }).limit(200);
  return <AdminShell active="activity" access={access}><div className="admin-content admin-activity-page">
    <div className="admin-page-title"><div><p className="admin-kicker">ADMIN OVERSIGHT</p><h1>Activity log.</h1><p>See who changed what across the admin dashboard, with the latest events first.</p></div><span className="activity-retention-pill">Up to 200 recent events</span></div>
    <section className="admin-panel activity-log-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">AUDIT TRAIL</p><h2>Administrator activity</h2><small>Sign-ins, account changes, and store updates are listed here.</small></div>{!error && <span className="activity-count-pill">{logs?.length ?? 0} events</span>}</div>
      {error ? <div className="admin-notice error" role="alert">Activity logging isn’t set up yet. Run <code>supabase/admin-profiles-activity.sql</code> in your Supabase SQL editor, then refresh this page.</div> : logs?.length ? <div className="admin-activity-list">{logs.map((log) => <article key={log.id}><span className="admin-activity-mark">{log.action === "sign_in" ? <ArrowIcon /> : log.action === "sign_out" ? <ArrowIcon direction="down-left" /> : "•"}</span><div className="admin-activity-detail"><div><b>{log.actor_email}</b><span>{log.action.replaceAll("_", " ")}</span></div><p>{log.summary}</p><small>{formatDateTime(log.created_at)}</small></div><span className="admin-activity-type">{log.entity_type.replaceAll("_", " ")}</span></article>)}</div> : <div className="admin-orders-empty">No admin activity has been recorded yet. Sign-ins and dashboard changes will appear here.</div>}
    </section>
  </div></AdminShell>;
}
