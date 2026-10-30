import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const ADMIN_FEATURES = ["overview", "products", "inventory", "orders", "customers", "marketing", "reports"] as const;
export type AdminFeature = (typeof ADMIN_FEATURES)[number];
export type AdminRole = "super_admin" | "admin";
export type AdminAccess = { role: AdminRole; permissions: AdminFeature[]; email: string; userId: string; mustChangePassword: boolean; displayName: string | null; phone: string | null; avatarPath: string | null; avatarUrl: string | null };

export function hasFeatureAccess(access: AdminAccess, feature: AdminFeature) {
  return access.role === "super_admin" || access.permissions.includes(feature);
}

export async function getAdminSession() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : "";
  if (error || !userId) return { supabase, claims: null, access: null };

  const { data: row, error: accessError } = await supabase.from("admin_access")
    .select("email,role,permissions,must_change_password,display_name,phone,avatar_path").eq("user_id", userId).maybeSingle();
  if (accessError || !row || (row.role !== "super_admin" && row.role !== "admin")) {
    return { supabase, claims, access: null };
  }
  const permissions = Array.isArray(row.permissions)
    ? row.permissions.filter((permission): permission is AdminFeature => ADMIN_FEATURES.includes(permission as AdminFeature))
    : [];
  let avatarUrl: string | null = null;
  if (row.avatar_path) {
    try {
      const { data } = await (await import("@/lib/supabase/service")).createServiceClient().storage.from("admin-avatars").createSignedUrl(row.avatar_path, 3600);
      avatarUrl = data?.signedUrl ?? null;
    } catch { avatarUrl = null; }
  }
  return { supabase, claims, access: { userId, email: row.email, role: row.role as AdminRole, permissions, mustChangePassword: row.must_change_password === true, displayName: row.display_name, phone: row.phone, avatarPath: row.avatar_path, avatarUrl } satisfies AdminAccess };
}

export async function requireAdmin(feature?: AdminFeature, options: { allowPasswordChange?: boolean } = {}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin?setup=1");
  if (!session.access) redirect("/admin?access=denied");
  if (session.access.mustChangePassword && !options.allowPasswordChange) redirect("/admin/account?force=1");
  if (feature && !hasFeatureAccess(session.access, feature)) redirect("/admin?access=denied");
  return { ...session, access: session.access };
}

export async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (session.access.role !== "super_admin") redirect("/admin?access=denied");
  return session;
}
