"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmail } from "@/lib/store-email";

export async function placeCashOrder(formData: FormData) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) redirect("/checkout?error=setup");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const discountCode = String(formData.get("discount_code") ?? "").trim().toUpperCase();
  let items: unknown;
  try { items = JSON.parse(String(formData.get("items") ?? "[]")); } catch { redirect("/checkout?error=cart"); }
  if (!email || !fullName || !phone || !address || !city || !region || !Array.isArray(items) || !items.length || discountCode.length > 32 || (discountCode && !/^[A-Z0-9-]{3,32}$/.test(discountCode))) redirect("/checkout?error=details");

  const sessionClient = await createClient();
  const { data: auth } = await sessionClient.auth.getUser();
  const customerId = auth.user?.email_confirmed_at ? auth.user.id : null;
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("create_cash_order", {
    p_email: email,
    p_full_name: fullName,
    p_phone: phone,
    p_address: address,
    p_city: city,
    p_region: region,
    p_items: items,
    p_customer_id: customerId,
    p_discount_code: discountCode || null,
  });
  if (error || typeof data !== "string") {
    const message = error?.message.toLowerCase() ?? "";
    const code = message.includes("discount") ? "discount" : message.includes("stock") ? "stock" : error?.code === "P0001" ? "details" : "save";
    redirect(`/checkout?error=${code}`);
  }
  const { data: order } = await supabase.from("orders").select("tracking_reference").eq("id", data).maybeSingle();
  if (order?.tracking_reference) await sendOrderConfirmationEmail({ to: email, name: fullName, reference: order.tracking_reference });
  revalidatePath("/admin");
  redirect(`/order-confirmation/${data}`);
}
