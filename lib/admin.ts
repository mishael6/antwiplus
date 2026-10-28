import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function requireAdmin() {
  if (!isSupabaseConfigured()) redirect("/admin?setup=1");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/admin");
  const claims = data.claims as Record<string, unknown>;
  const appMetadata = claims.app_metadata as Record<string, unknown> | undefined;
  if (appMetadata?.role !== "admin") redirect("/admin?access=denied");
  return { supabase, claims };
}
