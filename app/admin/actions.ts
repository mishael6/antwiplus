"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession, requireAdmin } from "@/lib/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/admin?setup=1");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin?error=signin");
  const session = await getAdminSession();
  if (!session?.access) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/admin?access=denied");
  }
  if (session.access.mustChangePassword) redirect("/admin/account?force=1");
  if (session.access.permissions.includes("overview") || session.access.role === "super_admin") redirect("/admin");
  if (session.access.permissions.includes("products")) redirect("/admin/products");
  if (session.access.permissions.includes("orders")) redirect("/admin/orders");
  redirect("/admin?access=denied");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/admin");
}

export async function changeAdminPassword(formData: FormData) {
  const { supabase, access } = await requireAdmin(undefined, { allowPasswordChange: true });
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  if (newPassword.length < 10 || newPassword.length > 128) redirect("/admin/account?error=length");
  if (newPassword !== confirmPassword) redirect("/admin/account?error=mismatch");
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: access.email, password: currentPassword });
  if (verifyError) redirect("/admin/account?error=current");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) redirect("/admin/account?error=update");
  const { error: accessError } = await createServiceClient().from("admin_access")
    .update({ must_change_password: false }).eq("user_id", access.userId);
  if (accessError) redirect("/admin/account?error=flag");
  revalidatePath("/admin/account");
  redirect("/admin/account?success=1");
}

export async function createProduct(formData: FormData) {
  const { supabase } = await requireAdmin("products");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const category = String(formData.get("category") ?? "").trim();
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock") ?? 0);
  const visual = String(formData.get("visual") ?? "beauty");
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name || !slug || !category || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    redirect("/admin/products/new?error=invalid");
  }
  const { error } = await supabase.from("products").insert({
    name, slug, category, price_pesewas: Math.round(price * 100), stock_quantity: stock, visual,
    image_url: imageUrl, description, is_active: true,
  });
  if (error) redirect(`/admin/products/new?error=${encodeURIComponent(error.code === "23505" ? "slug" : "save")}`);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  redirect("/admin/products?created=1");
}

export async function toggleProduct(formData: FormData) {
  const { supabase } = await requireAdmin("products");
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active") ?? "") === "true";
  await supabase.from("products").update({ is_active: !isActive }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
}
