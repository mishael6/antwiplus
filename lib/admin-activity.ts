import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export async function logAdminActivity(input: {
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}) {
  try {
    await createServiceClient().from("admin_activity_logs").insert({
      actor_id: input.actorId,
      actor_email: input.actorEmail,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      summary: input.summary.slice(0, 500),
    });
  } catch {
    // Logging must never block a successful store operation.
  }
}
