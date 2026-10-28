import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { StoreFooter, StoreHeader } from "@/components/storefront";
import { createCustomerAccount, signInCustomer, signOutCustomer } from "./actions";

type AccountPageProps = { searchParams: Promise<{ created?: string; error?: string }> };

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return <><StoreHeader /><main className="store-page-shell"><p className="store-breadcrumb"><Link href="/">Home</Link> / Your account</p><div className="store-page-heading"><p className="admin-kicker">OPTIONAL CUSTOMER ACCOUNT</p><h1>Come on in.</h1><p>Checking out as a guest is always welcome. An account is here if you’d like to see your orders in one place.</p></div>
    <div className="account-forms"><section className="checkout-section"><p className="admin-kicker">ALREADY HAVE AN ACCOUNT?</p><h2>Sign in</h2>{query.error === "signin" && <p className="checkout-error" role="alert">We couldn’t sign you in with those details. Please check them and try again.</p>}<form action={signInCustomer} className="account-form"><label>Email address<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button className="store-primary-button full-button" type="submit">Sign in <span>↗</span></button></form></section>
    <section className="checkout-section"><p className="admin-kicker">NEW TO ANTWIPLUS?</p><h2>Create an account</h2>{query.created === "1" && <p className="account-success" role="status">Account started. Check your email to confirm it, then sign in to see your orders.</p>}{query.error === "signup" && <p className="checkout-error" role="alert">We couldn’t create that account. Check the email and use a password with at least 10 characters.</p>}<form action={createCustomerAccount} className="account-form"><label>Email address<input name="email" type="email" autoComplete="email" required /></label><label>Create a password<input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /><small>Use at least 10 characters. We’ll email you to confirm your address.</small></label><button className="store-primary-button full-button" type="submit">Create account <span>↗</span></button></form></section></div></main><StoreFooter /></>;

  const verified = Boolean(user.email_confirmed_at);
  let linkedOrders = false;
  if (verified && user.email) {
    const service = createServiceClient();
    const { error } = await service.from("orders").update({ customer_id: user.id }).eq("customer_email", user.email.toLowerCase()).is("customer_id", null);
    linkedOrders = !error;
  }
  const { data: orders } = await supabase.from("orders").select("id,items,total_pesewas,status,created_at").order("created_at", { ascending: false }).limit(25);
  return <><StoreHeader /><main className="store-page-shell"><p className="store-breadcrumb"><Link href="/">Home</Link> / Your account</p><div className="account-welcome"><div><p className="admin-kicker">YOUR ANTWIPLUS ACCOUNT</p><h1>Good to see you.</h1><p>{user.email}</p></div><form action={signOutCustomer}><button className="account-signout" type="submit">Sign out</button></form></div>
    {!verified && <p className="checkout-error">Confirm your email address to link earlier guest orders to this account.</p>}{verified && linkedOrders && <p className="account-success">Your verified-email orders are linked to your account.</p>}
    <section className="account-orders"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR SHOPPING</div><h2>Order history</h2></div><Link className="text-link" href="/shop">Shop again <span>↗</span></Link></div>
      {!orders?.length ? <div className="store-empty"><span>♡</span><h2>No orders to show yet.</h2><p>Your future orders will appear here. Guest orders made with this verified email will be linked automatically.</p><Link className="store-primary-button" href="/shop">Explore the shop <span>↗</span></Link></div> : <div className="account-order-list">{orders.map((order) => <article className="account-order-card" key={order.id}><div className="account-order-top"><div><span className="product-category">ORDER PLACED {new Date(order.created_at).toLocaleDateString("en-GH")}</span><h3>Order #{order.id.slice(0, 8).toUpperCase()}</h3></div><span className={`status-pill ${order.status === "paid" ? "live" : "draft"}`}>{order.status}</span></div><div className="account-order-bottom"><span>{Array.isArray(order.items) ? order.items.map((item) => `${String(item.name ?? "Item")} × ${String(item.quantity ?? 1)}`).join(", ") : "Order items"}</span><b>{formatPrice(Number(order.total_pesewas))}</b></div></article>)}</div>}
    </section></main><StoreFooter /></>;
}
