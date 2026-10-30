import Link from "next/link";
import { StoreFooter, StoreHeader } from "@/components/storefront";
import { PasswordInput } from "@/components/password-input";
import { createClient } from "@/lib/supabase/server";
import { updateCustomerPassword } from "../actions";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, supabase] = await Promise.all([searchParams, createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  return <><StoreHeader /><main className="store-page-shell"><p className="store-breadcrumb"><Link href="/">Home</Link> / <Link href="/account">Your account</Link> / Reset password</p>
    <div className="store-page-heading"><p className="admin-kicker">ACCOUNT SECURITY</p><h1>Choose a new password.</h1><p>Use at least 10 characters to keep your account secure.</p></div>
    <section className="checkout-section account-security-panel">
      {!user ? <><p className="checkout-error" role="alert">This password reset link has expired or is invalid. Request a fresh link from your account sign-in page.</p><Link className="store-primary-button" href="/account">Back to sign in <span>↗</span></Link></> : <>
        {error === "password" && <p className="checkout-error" role="alert">The passwords must match and contain 10 to 128 characters.</p>}
        <form action={updateCustomerPassword} className="account-form"><label>New password<PasswordInput name="password" autoComplete="new-password" minLength={10} maxLength={128} required /></label><label>Confirm new password<PasswordInput name="confirm" autoComplete="new-password" minLength={10} maxLength={128} required /></label><button className="store-primary-button full-button" type="submit">Save new password <span>↗</span></button></form>
      </>}
    </section>
  </main><StoreFooter /></>;
}
