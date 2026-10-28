"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/admin?setup=1");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin?error=signin");
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const appMetadata = claims?.app_metadata as Record<string, unknown> | undefined;
  if (appMetadata?.role !== "admin") {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/admin?access=denied");
  }
  redirect("/admin");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/admin");
}

export async function createProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
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
  redirect("/admin?created=1");
}

export async function toggleProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active") ?? "") === "true";
  await supabase.from("products").update({ is_active: !isActive }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin");
}
