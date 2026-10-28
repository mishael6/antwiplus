"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function placeCashOrder(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/checkout?error=setup");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  let items: unknown;
  try { items = JSON.parse(String(formData.get("items") ?? "[]")); } catch { redirect("/checkout?error=cart"); }
  if (!email || !fullName || !phone || !address || !city || !region || !Array.isArray(items) || !items.length) redirect("/checkout?error=details");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_cash_order", {
    p_email: email,
    p_full_name: fullName,
    p_phone: phone,
    p_address: address,
    p_city: city,
    p_region: region,
    p_items: items,
  });
  if (error || typeof data !== "string") redirect(`/checkout?error=${error?.code === "P0001" ? "stock" : "save"}`);
  revalidatePath("/admin");
  redirect(`/order-confirmation/${data}`);
}
