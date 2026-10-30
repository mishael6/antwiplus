"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession, requireAdmin, requireSuperAdmin } from "@/lib/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminActivity } from "@/lib/admin-activity";
import { sendOrderUpdateEmail } from "@/lib/store-email";

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
  await logAdminActivity({ actorId: session.access.userId, actorEmail: session.access.email, action: "sign_in", entityType: "session", summary: "Signed in to the admin dashboard." });
  if (session.access.mustChangePassword) redirect("/admin/account?force=1");
  if (session.access.permissions.includes("overview") || session.access.role === "super_admin") redirect("/admin");
  if (session.access.permissions.includes("products")) redirect("/admin/products");
  if (session.access.permissions.includes("orders")) redirect("/admin/orders");
  if (session.access.permissions.includes("inventory")) redirect("/admin/inventory");
  if (session.access.permissions.includes("customers")) redirect("/admin/customers");
  if (session.access.permissions.includes("marketing")) redirect("/admin/discounts");
  if (session.access.permissions.includes("reports")) redirect("/admin/reports");
  redirect("/admin?access=denied");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const session = await getAdminSession();
    if (session?.access) await logAdminActivity({ actorId: session.access.userId, actorEmail: session.access.email, action: "sign_out", entityType: "session", summary: "Signed out of the admin dashboard." });
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
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "password_changed", entityType: "account", summary: "Changed their dashboard password." });
  revalidatePath("/admin/account");
  redirect("/admin/account?success=1");
}

export async function updateAdminProfile(formData: FormData) {
  const { access } = await requireAdmin(undefined, { allowPasswordChange: true });
  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const avatar = formData.get("avatar");
  if (!displayName || displayName.length > 80 || phone.length > 32) redirect("/admin/account?profileError=invalid");
  const service = createServiceClient();
  let avatarPath = access.avatarPath;
  let uploadedPath: string | null = null;
  if (avatar instanceof File && avatar.size > 0) {
    const extension = avatar.type === "image/jpeg" ? "jpg" : avatar.type === "image/png" ? "png" : avatar.type === "image/webp" ? "webp" : "";
    if (!extension || avatar.size > 2 * 1024 * 1024) redirect("/admin/account?profileError=photo");
    uploadedPath = `${access.userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await service.storage.from("admin-avatars").upload(uploadedPath, avatar, { contentType: avatar.type, upsert: false });
    if (uploadError) redirect("/admin/account?profileError=upload");
    avatarPath = uploadedPath;
  }
  const { error } = await service.from("admin_access").update({ display_name: displayName, phone: phone || null, avatar_path: avatarPath }).eq("user_id", access.userId);
  if (error) {
    if (uploadedPath) await service.storage.from("admin-avatars").remove([uploadedPath]);
    redirect("/admin/account?profileError=save");
  }
  if (uploadedPath && access.avatarPath) await service.storage.from("admin-avatars").remove([access.avatarPath]);
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "profile_updated", entityType: "profile", entityId: access.userId, summary: `Updated profile${uploadedPath ? " and profile photo" : ""}.` });
  revalidatePath("/admin"); revalidatePath("/admin/account"); revalidatePath("/admin/team");
  redirect("/admin/account?profileSaved=1");
}

export async function createProduct(formData: FormData) {
  const { supabase, access } = await requireAdmin("products");
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
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "product_created", entityType: "product", entityId: slug, summary: `Created product “${name}”.` });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  redirect("/admin/products?created=1");
}

export async function updateProduct(formData: FormData) {
  const { supabase, access } = await requireAdmin("products");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const category = String(formData.get("category") ?? "").trim();
  const price = Number(formData.get("price"));
  const compareAt = String(formData.get("compare_at") ?? "").trim() ? Number(formData.get("compare_at")) : null;
  const visual = String(formData.get("visual") ?? "beauty");
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const tag = String(formData.get("tag") ?? "").trim().slice(0, 50) || null;
  const isActive = String(formData.get("is_active")) === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !name || !slug || !category || !Number.isFinite(price) || price <= 0 || (compareAt !== null && (!Number.isFinite(compareAt) || compareAt <= price)) || !["tote", "headphones", "candles", "beauty"].includes(visual)) redirect("/admin/products?error=invalid");
  const { error } = await supabase.from("products").update({ name, slug, category, price_pesewas: Math.round(price * 100), compare_at_pesewas: compareAt === null ? null : Math.round(compareAt * 100), visual, image_url: imageUrl, description, tag, is_active: isActive }).eq("id", id);
  if (error) redirect(`/admin/products/${id}?error=${encodeURIComponent(error.code === "23505" ? "slug" : "save")}`);
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "product_updated", entityType: "product", entityId: id, summary: `Updated product “${name}”.` });
  revalidatePath("/"); revalidatePath("/shop"); revalidatePath(`/products/${slug}`); revalidatePath("/admin/products"); revalidatePath("/admin");
  redirect("/admin/products?updated=1");
}

export async function toggleProduct(formData: FormData) {
  const { supabase, access } = await requireAdmin("products");
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active") ?? "") === "true";
  const { data: product } = await supabase.from("products").select("name").eq("id", id).maybeSingle();
  const { error } = await supabase.from("products").update({ is_active: !isActive }).eq("id", id);
  if (!error) await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: isActive ? "product_unpublished" : "product_published", entityType: "product", entityId: id, summary: `${isActive ? "Unpublished" : "Published"} product${product?.name ? ` “${product.name}”` : ""}.` });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
}

export async function updateProductStock(formData: FormData) {
  const { access } = await requireAdmin("inventory");
  const id = String(formData.get("id") ?? "");
  const stock = Number(formData.get("stock_quantity"));
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(stock) || stock < 0 || stock > 1000000) redirect("/admin/inventory?error=invalid");
  const { error } = await createServiceClient().from("products").update({ stock_quantity: stock }).eq("id", id);
  if (error) redirect("/admin/inventory?error=save");
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "inventory_updated", entityType: "product", entityId: id, summary: `Changed product stock to ${stock}.` });
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  revalidatePath("/shop");
  redirect("/admin/inventory?updated=1");
}

export async function createDiscountCode(formData: FormData) {
  const { access } = await requireAdmin("marketing");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("discount_type") ?? "");
  const rawValue = Number(formData.get("discount_value"));
  const minimum = Number(formData.get("minimum_order") ?? 0);
  const rawLimit = String(formData.get("usage_limit") ?? "").trim();
  const expiry = String(formData.get("expires_at") ?? "").trim();
  if (!/^[A-Z0-9-]{3,32}$/.test(code) || !["percent", "fixed"].includes(type) || !Number.isFinite(rawValue) || rawValue <= 0 || (type === "percent" && (!Number.isInteger(rawValue) || rawValue > 100)) || !Number.isFinite(minimum) || minimum < 0 || (rawLimit && (!Number.isInteger(Number(rawLimit)) || Number(rawLimit) < 1))) redirect("/admin/discounts?error=invalid");
  const discountValue = type === "fixed" ? Math.round(rawValue * 100) : rawValue;
  const minimumPesewas = Math.round(minimum * 100);
  const expiresAt = expiry ? new Date(`${expiry}T23:59:59.999Z`) : null;
  if (expiresAt && !Number.isFinite(expiresAt.getTime())) redirect("/admin/discounts?error=invalid");
  const { error } = await createServiceClient().from("discount_codes").insert({
    code, discount_type: type, discount_value: discountValue, minimum_order_pesewas: minimumPesewas,
    usage_limit: rawLimit ? Number(rawLimit) : null, expires_at: expiresAt?.toISOString() ?? null, is_active: true,
  });
  if (error) redirect(`/admin/discounts?error=${error.code === "23505" ? "exists" : "save"}`);
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "discount_created", entityType: "discount", entityId: code, summary: `Created discount code ${code}.` });
  revalidatePath("/admin/discounts"); revalidatePath("/checkout");
  redirect("/admin/discounts?created=1");
}

export async function toggleDiscountCode(formData: FormData) {
  const { access } = await requireAdmin("marketing");
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/discounts?error=save");
  const { error } = await createServiceClient().from("discount_codes").update({ is_active: !active }).eq("id", id);
  if (error) redirect("/admin/discounts?error=save");
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: active ? "discount_disabled" : "discount_enabled", entityType: "discount", entityId: id, summary: `${active ? "Disabled" : "Enabled"} a discount code.` });
  revalidatePath("/admin/discounts"); revalidatePath("/checkout");
  redirect("/admin/discounts?updated=1");
}

export async function saveStoreSettings(formData: FormData) {
  const { access } = await requireSuperAdmin();
  const announcement = String(formData.get("announcement") ?? "").trim();
  const deliveryNote = String(formData.get("delivery_note") ?? "").trim();
  const supportEmail = String(formData.get("support_email") ?? "").trim().toLowerCase();
  const supportPhone = String(formData.get("support_phone") ?? "").trim();
  if (!announcement || announcement.length > 100 || !deliveryNote || deliveryNote.length > 70 || (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) || supportPhone.length > 40) redirect("/admin/settings?error=invalid");
  const { error } = await createServiceClient().from("store_settings").upsert({ id: true, announcement, delivery_note: deliveryNote, support_email: supportEmail, support_phone: supportPhone });
  if (error) redirect("/admin/settings?error=save");
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "store_settings_updated", entityType: "store_settings", summary: "Updated announcement, delivery note, or customer support details." });
  revalidatePath("/"); revalidatePath("/shop"); revalidatePath("/checkout"); revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

const ORDER_STATUSES = ["pending", "confirmed", "paid", "processing", "shipped", "out_for_delivery", "delivered", "delivery_failed", "cancelled", "refunded"] as const;

export async function updateOrderFulfillment(formData: FormData) {
  const { access } = await requireAdmin("orders");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const carrier = String(formData.get("tracking_carrier") ?? "").trim().slice(0, 100) || null;
  const trackingCode = String(formData.get("tracking_code") ?? "").trim().slice(0, 120) || null;
  const trackingUrl = String(formData.get("tracking_url") ?? "").trim() || null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) redirect("/admin/orders?error=invalid");
  if (trackingUrl) {
    try { if (new URL(trackingUrl).protocol !== "https:") redirect("/admin/orders?error=invalid"); }
    catch { redirect("/admin/orders?error=invalid"); }
  }
  const service = createServiceClient();
  const { data: previousOrder } = await service.from("orders").select("customer_email,tracking_reference,status,tracking_carrier,tracking_code,tracking_url,delivery_address").eq("id", id).maybeSingle();
  const { error } = await service.from("orders").update({
    status, tracking_carrier: carrier, tracking_code: trackingCode, tracking_url: trackingUrl,
  }).eq("id", id);
  if (error) redirect("/admin/orders?error=save");
  const changed = previousOrder && (previousOrder.status !== status || previousOrder.tracking_carrier !== carrier || previousOrder.tracking_code !== trackingCode || previousOrder.tracking_url !== trackingUrl);
  if (changed && previousOrder?.customer_email && previousOrder.tracking_reference) {
    const address = previousOrder.delivery_address && typeof previousOrder.delivery_address === "object" ? previousOrder.delivery_address as Record<string, unknown> : {};
    await sendOrderUpdateEmail({ to: previousOrder.customer_email, name: String(address.full_name ?? "there"), reference: previousOrder.tracking_reference, status, carrier, trackingCode, trackingUrl });
  }
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "order_fulfillment_updated", entityType: "order", entityId: id, summary: `Updated order status to ${status}.` });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect("/admin/orders?updated=1");
}
