"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_FEATURES, requireSuperAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function addAdmin(formData: FormData) {
  const { access } = await requireSuperAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const permissions = formData.getAll("permissions").map(String).filter((value) => ADMIN_FEATURES.includes(value as (typeof ADMIN_FEATURES)[number]));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin/team?error=email");
  if (password.length < 10 || password.length > 128) redirect("/admin/team?error=password");
  const service = createServiceClient();
  const { data: created, error: createError } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) redirect(`/admin/team?error=${createError?.code === "email_exists" ? "exists" : "create"}`);
  const user = { id: created.user.id };
  const { error } = await service.from("admin_access").insert({ user_id: user.id, email, role: "admin", permissions, created_by: access.userId, must_change_password: true });
  if (error) {
    await service.auth.admin.deleteUser(user.id);
    redirect("/admin/team?error=save");
  }
  revalidatePath("/admin/team");
  redirect("/admin/team?success=1");
}

export async function updateAdminPermissions(formData: FormData) {
  await requireSuperAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const permissions = formData.getAll("permissions").map(String).filter((value) => ADMIN_FEATURES.includes(value as (typeof ADMIN_FEATURES)[number]));
  if (!userId) redirect("/admin/team?error=save");
  const service = createServiceClient();
  const { error } = await service.from("admin_access").update({ permissions }).eq("user_id", userId).eq("role", "admin");
  if (error) redirect("/admin/team?error=save");
  revalidatePath("/admin/team");
  redirect("/admin/team?success=1");
}

export async function resetAdminPassword(formData: FormData) {
  await requireSuperAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId) redirect("/admin/team?error=reset");
  if (password.length < 10 || password.length > 128) redirect("/admin/team?error=password");
  const service = createServiceClient();
  const { data: member } = await service.from("admin_access").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!member) redirect("/admin/team?error=reset");
  const { error: flagError } = await service.from("admin_access").update({ must_change_password: true }).eq("user_id", userId).eq("role", "admin");
  if (flagError) redirect("/admin/team?error=reset");
  const { error } = await service.auth.admin.updateUserById(userId, { password });
  if (error) {
    await service.from("admin_access").update({ must_change_password: false }).eq("user_id", userId).eq("role", "admin");
    redirect("/admin/team?error=reset");
  }
  revalidatePath("/admin/team");
  redirect("/admin/team?success=reset");
}

export async function removeAdmin(formData: FormData) {
  const { access } = await requireSuperAdmin();
  const userId = String(formData.get("user_id") ?? "");
  if (!userId || userId === access.userId) redirect("/admin/team?error=remove");
  const service = createServiceClient();
  const { error } = await service.from("admin_access").delete().eq("user_id", userId).eq("role", "admin");
  if (error) redirect("/admin/team?error=remove");
  revalidatePath("/admin/team");
  redirect("/admin/team?success=1");
}
