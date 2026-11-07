"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession, requireAdmin, requireSuperAdmin } from "@/lib/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminActivity } from "@/lib/admin-activity";
import { sendOrderUpdateEmail } from "@/lib/store-email";
import { slugifyProductName } from "@/lib/product-slug";

type SavedColorVariant = { id?: string; name: string; hex: string; image_url: string; sort_order: number };

async function uploadColorVariants(formData: FormData, supabase: Awaited<ReturnType<typeof createClient>>, errorPath: string): Promise<{ variants: SavedColorVariant[]; uploadedPaths: string[] }> {
  const count = Number(formData.get("variant_count") ?? 0);
  if (!Number.isInteger(count) || count < 0 || count > 10) redirect(`${errorPath}?error=invalid`);
  const prepared: { id?: string; name: string; hex: string; existingUrl: string; image: File | null }[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < count; index++) {
    const name = String(formData.get(`color_name_${index}`) ?? "").trim().slice(0, 40);
    const hex = String(formData.get(`color_hex_${index}`) ?? "").trim();
    const existingUrl = String(formData.get(`color_existing_image_${index}`) ?? "").trim();
    const rawImage = formData.get(`color_image_${index}`);
    const image = rawImage instanceof File && rawImage.size > 0 ? rawImage : null;
    if (!name || !/^#[0-9a-f]{6}$/i.test(hex) || seen.has(name.toLowerCase())) redirect(`${errorPath}?error=invalid`);
    seen.add(name.toLowerCase());
    if (image) {
      const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "";
      if (!extension || image.size > 5 * 1024 * 1024) redirect(`${errorPath}?error=image`);
    }
    if (!image && !existingUrl) redirect(`${errorPath}?error=invalid`);
    const id = String(formData.get(`color_id_${index}`) ?? "");
    prepared.push({ ...( /^[0-9a-f-]{36}$/i.test(id) ? { id } : {} ), name, hex, existingUrl, image });
  }
  const variants: SavedColorVariant[] = [];
  const uploadedPaths: string[] = [];
  for (const [index, item] of prepared.entries()) {
    let imageUrl = item.existingUrl;
    if (item.image) {
      const extension = item.image.type === "image/jpeg" ? "jpg" : item.image.type === "image/png" ? "png" : "webp";
      const path = `products/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("product-images").upload(path, item.image, { contentType: item.image.type, upsert: false });
      if (error) {
        if (uploadedPaths.length) await supabase.storage.from("product-images").remove(uploadedPaths);
        redirect(`${errorPath}?error=upload`);
      }
      uploadedPaths.push(path);
      imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
    variants.push({ ...(item.id ? { id: item.id } : {}), name: item.name, hex: item.hex, image_url: imageUrl, sort_order: index });
  }
  return { variants, uploadedPaths };
}

async function generateProductSlug(name: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const base = slugifyProductName(name) || "product";
  for (let index = 1; index <= 100; index++) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const { data, error } = await supabase.from("products").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function saveColorVariants(productId: string, variants: SavedColorVariant[], supabase: Awaited<ReturnType<typeof createClient>>) {
  const service = createServiceClient();
  const { data: previous, error: readError } = await service.from("product_color_variants").select("id,name,hex,image_url,sort_order").eq("product_id", productId);
  if (readError) return { error: readError, previous: [] as SavedColorVariant[] };
  const existingIds = new Set((previous ?? []).map((variant) => variant.id));
  const submitted = variants.map(({ id, ...variant }) => ({ ...variant, id: id && existingIds.has(id) ? id : crypto.randomUUID(), product_id: productId }));
  const { error: upsertError } = submitted.length ? await service.from("product_color_variants").upsert(submitted, { onConflict: "id" }) : { error: null };
  if (upsertError) return { error: upsertError, previous: (previous ?? []) as SavedColorVariant[] };
  const retainedIds = new Set(submitted.flatMap((variant) => "id" in variant && variant.id ? [variant.id] : []));
  const removedIds = (previous ?? []).map((variant) => variant.id).filter((id) => !retainedIds.has(id));
  if (removedIds.length) {
    const { error } = await service.from("product_color_variants").delete().in("id", removedIds).eq("product_id", productId);
    if (error) return { error, previous: (previous ?? []) as SavedColorVariant[] };
  }
  return { error: null, previous: (previous ?? []) as SavedColorVariant[] };
}

function productImageStoragePath(url: string | null | undefined) {
  const match = typeof url === "string" ? url.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/) : null;
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

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
  const category = String(formData.get("category") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim().slice(0, 80) || null;
  const price = Number(formData.get("price"));
  const compareAt = String(formData.get("compare_at") ?? "").trim() ? Number(formData.get("compare_at")) : null;
  const stock = Number(formData.get("stock") ?? 0);
  const image = formData.get("image");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name || !category || !Number.isFinite(price) || price <= 0 || (compareAt !== null && (!Number.isFinite(compareAt) || compareAt <= price)) || !Number.isInteger(stock) || stock < 0) {
    redirect("/admin/products/new?error=invalid");
  }
  let slug: string;
  try { slug = await generateProductSlug(name, supabase); } catch { redirect("/admin/products/new?error=save"); }
  if (!(image instanceof File) || image.size === 0) redirect("/admin/products/new?error=image");
  const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "";
  if (!extension || image.size > 5 * 1024 * 1024) redirect("/admin/products/new?error=image");
  const variantCount = Number(formData.get("variant_count") ?? 0);
  const primaryColorName = String(formData.get("primary_color_name") ?? "").trim().slice(0, 40);
  const primaryColorHex = String(formData.get("primary_color_hex") ?? "").trim();
  if (!Number.isInteger(variantCount) || variantCount < 0 || variantCount > 10 || !primaryColorName || !/^#[0-9a-f]{6}$/i.test(primaryColorHex)) redirect("/admin/products/new?error=invalid");
  if (variantCount > 0 && Array.from({ length: variantCount }, (_, index) => String(formData.get(`color_name_${index}`) ?? "").trim().toLowerCase()).includes(primaryColorName.toLowerCase())) redirect("/admin/products/new?error=invalid");
  const { variants: extraVariants, uploadedPaths: variantPaths } = await uploadColorVariants(formData, supabase, "/admin/products/new");
  const imagePath = `products/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("product-images").upload(imagePath, image, { contentType: image.type, upsert: false });
  if (uploadError) { if (variantPaths.length) await supabase.storage.from("product-images").remove(variantPaths); redirect("/admin/products/new?error=upload"); }
  const imageUrl = supabase.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl;
  const { data: createdProduct, error } = await supabase.from("products").insert({
    name, slug, category, brand, price_pesewas: Math.round(price * 100), compare_at_pesewas: compareAt === null ? null : Math.round(compareAt * 100), stock_quantity: stock,
    image_url: imageUrl, description, is_active: true,
  }).select("id").single();
  if (error) {
    await supabase.storage.from("product-images").remove([imagePath]);
    if (variantPaths.length) await supabase.storage.from("product-images").remove(variantPaths);
    redirect(`/admin/products/new?error=${encodeURIComponent(error.code === "23505" ? "slug" : "save")}`);
  }
  const variants = [{ name: primaryColorName, hex: primaryColorHex, image_url: imageUrl, sort_order: 0 }, ...extraVariants.map((variant) => ({ ...variant, sort_order: variant.sort_order + 1 }))];
  if (createdProduct) {
    const result = await saveColorVariants(createdProduct.id, variants, supabase);
    if (result.error) {
      await supabase.from("products").delete().eq("id", createdProduct.id);
      await supabase.storage.from("product-images").remove([imagePath, ...variantPaths]);
      redirect("/admin/products/new?error=save");
    }
  }
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
  const brand = String(formData.get("brand") ?? "").trim().slice(0, 80) || null;
  const price = Number(formData.get("price"));
  const compareAt = String(formData.get("compare_at") ?? "").trim() ? Number(formData.get("compare_at")) : null;
  const image = formData.get("image");
  const description = String(formData.get("description") ?? "").trim() || null;
  const tag = String(formData.get("tag") ?? "").trim().slice(0, 50) || null;
  const isActive = String(formData.get("is_active")) === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !category || !Number.isFinite(price) || price <= 0 || (compareAt !== null && (!Number.isFinite(compareAt) || compareAt <= price))) redirect("/admin/products?error=invalid");
  const { data: before } = await supabase.from("products").select("slug,image_url").eq("id", id).maybeSingle();
  let imageUrl: string | undefined;
  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "";
    if (!extension || image.size > 5 * 1024 * 1024) redirect(`/admin/products/${id}?error=image`);
  }
  const { variants, uploadedPaths: variantPaths } = await uploadColorVariants(formData, supabase, `/admin/products/${id}`);
  if (image instanceof File && image.size > 0) {
    const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/png" ? "png" : "webp";
    imagePath = `products/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(imagePath, image, { contentType: image.type, upsert: false });
    if (uploadError) { if (variantPaths.length) await supabase.storage.from("product-images").remove(variantPaths); redirect(`/admin/products/${id}?error=upload`); }
    imageUrl = supabase.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl;
  }
  const { error } = await supabase.from("products").update({ name, slug, category, brand, price_pesewas: Math.round(price * 100), compare_at_pesewas: compareAt === null ? null : Math.round(compareAt * 100), ...(imageUrl ? { image_url: imageUrl } : {}), description, tag, is_active: isActive }).eq("id", id);
  if (error) {
    if (imagePath) await supabase.storage.from("product-images").remove([imagePath]);
    if (variantPaths.length) await supabase.storage.from("product-images").remove(variantPaths);
    redirect(`/admin/products/${id}?error=${encodeURIComponent(error.code === "23505" ? "slug" : "save")}`);
  }
  const result = await saveColorVariants(id, variants, supabase);
  if (result.error) {
    console.error("[product-update] Color options could not be saved", { productId: id, code: result.error.code, message: result.error.message, details: result.error.details, hint: result.error.hint });
    if (imagePath) await supabase.storage.from("product-images").remove([imagePath]);
    if (variantPaths.length) await supabase.storage.from("product-images").remove(variantPaths);
    redirect(`/admin/products/${id}?error=variants`);
  }
  const retainedImages = new Set(variants.map((variant) => variant.image_url));
  const removedVariantImages = result.previous.map((variant) => productImageStoragePath(variant.image_url)).filter((path): path is string => Boolean(path)).filter((path) => {
    const previousUrl = result.previous.find((variant) => productImageStoragePath(variant.image_url) === path)?.image_url;
    return Boolean(previousUrl && !retainedImages.has(previousUrl));
  });
  if (removedVariantImages.length) await supabase.storage.from("product-images").remove(removedVariantImages);
  const oldProductImagePath = imageUrl ? productImageStoragePath(before?.image_url) : null;
  if (oldProductImagePath) await supabase.storage.from("product-images").remove([oldProductImagePath]);
  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "product_updated", entityType: "product", entityId: id, summary: `Updated product “${name}”.` });
  revalidatePath("/"); revalidatePath("/shop"); revalidatePath(`/products/${slug}`); if (before?.slug && before.slug !== slug) revalidatePath(`/products/${before.slug}`); revalidatePath("/admin/products"); revalidatePath("/admin");
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

export async function deleteProduct(formData: FormData) {
  const { supabase, access } = await requireAdmin("products");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/products?error=delete");

  const { data: product, error: readError } = await supabase.from("products").select("name,slug,image_url").eq("id", id).maybeSingle();
  if (readError || !product) redirect("/admin/products?error=delete");
  const { data: colorVariants, error: variantsError } = await createServiceClient().from("product_color_variants").select("image_url").eq("product_id", id);
  if (variantsError) redirect("/admin/products?error=delete");

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) redirect("/admin/products?error=delete");

  const imagePaths = [product.image_url, ...(colorVariants ?? []).map((variant) => variant.image_url)].map(productImageStoragePath).filter((path): path is string => Boolean(path));
  if (imagePaths.length) {
    const { error: imageError } = await supabase.storage.from("product-images").remove([...new Set(imagePaths)]);
    if (imageError) console.error("Product deleted, but some stored images could not be removed.", imageError.message);
  }

  await logAdminActivity({ actorId: access.userId, actorEmail: access.email, action: "product_deleted", entityType: "product", entityId: id, summary: `Permanently deleted product “${product.name}”.` });
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  redirect("/admin/products?deleted=1");
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

export async function clearSelectedStoreData(formData: FormData) {
  const { access } = await requireSuperAdmin();
  const allowed = ["orders", "products", "customers", "discounts", "activity", "store_settings"] as const;
  const selected = new Set(formData.getAll("clear").map(String));
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (!allowed.some((key) => selected.has(key))) redirect("/admin/settings?clearError=selection");
  if (confirmation !== "CLEAR ANTWIPLUS DATA") redirect("/admin/settings?clearError=confirmation");

  const service = createServiceClient();
  const clear = Object.fromEntries(allowed.map((key) => [key, selected.has(key)]));
  const productImagePaths: string[] = [];
  const customerAvatarPaths: string[] = [];

  if (selected.has("products")) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await service.from("products").select("image_url").range(offset, offset + 999);
      if (error) redirect("/admin/settings?clearError=read");
      for (const row of data ?? []) {
        const path = typeof row.image_url === "string" ? row.image_url.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/)?.[1] : null;
        if (path) { try { productImagePaths.push(decodeURIComponent(path)); } catch { productImagePaths.push(path); } }
      }
      if (!data || data.length < 1000) break;
    }
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await service.from("product_color_variants").select("image_url").range(offset, offset + 999);
      if (error) redirect("/admin/settings?clearError=read");
      for (const row of data ?? []) {
        const path = productImageStoragePath(row.image_url);
        if (path) productImagePaths.push(path);
      }
      if (!data || data.length < 1000) break;
    }
  }

  if (selected.has("customers")) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await service.from("customer_profiles").select("avatar_path").not("avatar_path", "is", null).range(offset, offset + 999);
      if (error) redirect("/admin/settings?clearError=read");
      customerAvatarPaths.push(...(data ?? []).map((row) => row.avatar_path).filter((path): path is string => Boolean(path)));
      if (!data || data.length < 1000) break;
    }
  }

  const { error } = await service.rpc("super_admin_clear_store_data", {
    p_actor_id: access.userId,
    p_confirmation: confirmation,
    p_clear: clear,
  });
  if (error) {
    // Keep the detailed Postgres response in the server logs for diagnosis, while
    // showing the super admin a concise explanation that does not expose SQL.
    console.error("[data-cleanup] Supabase cleanup RPC failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    const reason = error.code === "PGRST202" || error.code === "42883" ? "setup"
      : error.code === "42501" ? "permission"
      : error.code === "22023" ? "confirmation"
      : error.code === "23503" ? "dependency"
      : error.code === "21000" ? "cardinality"
      : error.code === "42P01" || error.code === "42703" ? "schema"
      : "failed";
    const code = /^[A-Z0-9]{5}$/.test(error.code ?? "") ? error.code : "unknown";
    redirect(`/admin/settings?clearError=${reason}&clearCode=${code}`);
  }

  let mediaCleanupFailed = false;
  for (const [bucket, paths] of [["product-images", productImagePaths], ["customer-avatars", customerAvatarPaths]] as const) {
    for (let offset = 0; offset < paths.length; offset += 100) {
      const { error: storageError } = await service.storage.from(bucket).remove(paths.slice(offset, offset + 100));
      if (storageError) mediaCleanupFailed = true;
    }
  }

  revalidatePath("/"); revalidatePath("/shop"); revalidatePath("/admin"); revalidatePath("/admin/products"); revalidatePath("/admin/orders"); revalidatePath("/admin/customers"); revalidatePath("/admin/discounts"); revalidatePath("/admin/reports"); revalidatePath("/admin/activity"); revalidatePath("/admin/settings");
  redirect(mediaCleanupFailed ? "/admin/settings?cleared=media-warning" : "/admin/settings?cleared=1");
}
