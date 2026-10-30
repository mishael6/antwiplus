"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function createCustomerAccount(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = formData.get("next") === "/checkout" ? "/checkout" : "/account";
  if (!email || password.length < 10 || password.length > 128) redirect(`/account?error=signup${next === "/checkout" ? "&next=/checkout" : ""}`);
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const { data, error } = await supabase.auth.signUp({ email, password, ...(siteUrl ? { options: { emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(next)}` } } : {}) });
  if (error) redirect(`/account?error=signup${next === "/checkout" ? "&next=/checkout" : ""}`);
  if (data.session) redirect(next);
  redirect(`/account?created=1${next === "/checkout" ? "&next=/checkout" : ""}`);
}

export async function signInCustomer(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = formData.get("next") === "/checkout" ? "/checkout" : "/account";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/account?error=signin${next === "/checkout" ? "&next=/checkout" : ""}`);
  revalidatePath("/account");
  redirect(next);
}

export async function requestCustomerPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/account?error=reset");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) redirect("/account?error=reset");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/account/reset-password`,
  });
  if (error) redirect("/account?error=reset");
  redirect("/account?reset=sent");
}

export async function updateCustomerPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 10 || password.length > 128 || password !== confirm) {
    redirect("/account/reset-password?error=password");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account?error=expired");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/account/reset-password?error=password");
  revalidatePath("/account");
  redirect("/account?password=updated");
}

export async function changeCustomerPassword(formData: FormData) {
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 10 || password.length > 128 || password !== confirm) {
    redirect("/account?error=change-password");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account?error=signin");
  const { error } = await supabase.auth.updateUser({ password, current_password: current });
  if (error) redirect("/account?error=change-password");
  revalidatePath("/account");
  redirect("/account?password=updated");
}

export async function updateCustomerProfile(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const photo = formData.get("photo");
  if (!displayName || displayName.length > 80 || phone.length > 32) redirect("/account?error=profile");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account?error=signin");
  const service = createServiceClient();
  const { data: current } = await service.from("customer_profiles").select("avatar_path").eq("user_id", user.id).maybeSingle();
  let avatarPath = current?.avatar_path ?? null;
  if (photo instanceof File && photo.size > 0) {
    const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const extension = extensions[photo.type];
    if (!extension || photo.size > 2 * 1024 * 1024) redirect("/account?error=photo");
    avatarPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await service.storage.from("customer-avatars").upload(avatarPath, photo, { contentType: photo.type, upsert: false });
    if (error) redirect("/account?error=photo");
  }
  const { error } = await service.from("customer_profiles").upsert({ user_id: user.id, display_name: displayName, phone: phone || null, avatar_path: avatarPath }, { onConflict: "user_id" });
  if (error) {
    if (avatarPath && avatarPath !== current?.avatar_path) await service.storage.from("customer-avatars").remove([avatarPath]);
    redirect("/account?error=profile");
  }
  if (current?.avatar_path && avatarPath !== current.avatar_path) await service.storage.from("customer-avatars").remove([current.avatar_path]);
  revalidatePath("/account");
  redirect("/account?profile=updated");
}

export async function signOutCustomer() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/account");
  redirect("/account");
}
