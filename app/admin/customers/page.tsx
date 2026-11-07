import { ArrowIcon } from "@/components/arrow-icon";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { AdminCustomerOrderHistory } from "@/components/admin-customer-order-history";
import { requireAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/date-format";
import { createServiceClient } from "@/lib/supabase/service";

type Buyer = {
  email: string;
  name: string;
  phone: string;
  avatarUrl: string | null;
  account: boolean;
  joinedAt: string | null;
  orders: { id: string; tracking_reference: string | null; total_pesewas: number; status: string; created_at: string }[];
  total: number;
};
const money = (value: number) => `GH₵ ${(value / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ access }, query] = await Promise.all([requireAdmin("customers"), searchParams]);
  const service = createServiceClient();
  const [{ data: orderData, error }, { data: profileData }, { data: adminData }] = await Promise.all([
    service.from("orders").select("id,customer_id,tracking_reference,customer_email,total_pesewas,status,created_at,delivery_address").order("created_at", { ascending: false }).limit(1000),
    service.from("customer_profiles").select("user_id,display_name,phone,avatar_path"),
    service.from("admin_access").select("user_id"),
  ]);

  const profileByUserId = new Map((profileData ?? []).map((profile) => [profile.user_id, profile]));
  const profilesWithPhotos = (profileData ?? []).filter((profile) => profile.avatar_path);
  const signedAvatarBatch = profilesWithPhotos.length
    ? await service.storage.from("customer-avatars").createSignedUrls(profilesWithPhotos.map((profile) => profile.avatar_path!), 3600)
    : { data: [] };
  const signedUrlByPath = new Map((signedAvatarBatch.data ?? []).flatMap((entry) => entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []));
  const avatarByUserId = new Map<string, string | null>();
  await Promise.all(profilesWithPhotos.map(async (profile) => {
    let signedUrl = signedUrlByPath.get(profile.avatar_path!) ?? null;
    if (!signedUrl) {
      const { data } = await service.storage.from("customer-avatars").createSignedUrl(profile.avatar_path!, 3600);
      signedUrl = data?.signedUrl ?? null;
    }
    avatarByUserId.set(profile.user_id, signedUrl);
  }));

  const buyers = new Map<string, Buyer>();
  for (const order of orderData ?? []) {
    const email = String(order.customer_email ?? "").trim().toLowerCase();
    if (!email) continue;
    const address = order.delivery_address && typeof order.delivery_address === "object" ? order.delivery_address as Record<string, unknown> : {};
    const linkedProfile = order.customer_id ? profileByUserId.get(order.customer_id) : undefined;
    let buyer = buyers.get(email);
    if (!buyer) {
      buyer = { email, name: linkedProfile?.display_name || String(address.full_name ?? "Guest buyer"), phone: linkedProfile?.phone || String(address.phone ?? ""), avatarUrl: order.customer_id ? avatarByUserId.get(order.customer_id) ?? null : null, account: Boolean(order.customer_id), joinedAt: null, orders: [], total: 0 };
      buyers.set(email, buyer);
    }
    if (linkedProfile) {
      buyer.account = true;
      buyer.name = linkedProfile.display_name || buyer.name;
      buyer.phone = linkedProfile.phone || buyer.phone;
      buyer.avatarUrl = avatarByUserId.get(order.customer_id!) ?? buyer.avatarUrl;
    }
    if (buyer.name === "Guest buyer" && address.full_name) buyer.name = String(address.full_name);
    if (!buyer.phone && address.phone) buyer.phone = String(address.phone);
    buyer.orders.push({ id: order.id, tracking_reference: order.tracking_reference, total_pesewas: Number(order.total_pesewas), status: order.status, created_at: order.created_at });
    buyer.total += Number(order.total_pesewas);
  }

  // Add every registered customer, including accounts that have not ordered yet.
  const authUsers = [];
  for (let page = 1; ; page += 1) {
    const { data, error: usersError } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (usersError || !data.users.length) break;
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const adminIds = new Set((adminData ?? []).map((row) => row.user_id));
  const accountUsers = authUsers.filter((user) => user.email && !adminIds.has(user.id));

  for (const user of accountUsers) {
    const email = user.email!.trim().toLowerCase();
    const profile = profileByUserId.get(user.id);
    const metadata = user.user_metadata ?? {};
    const metadataName = metadata.display_name ?? metadata.full_name ?? metadata.name;
    const buyerName = profile?.display_name || (typeof metadataName === "string" ? metadataName : "") || email.split("@")[0] || "Customer";
    const metadataPhone = metadata.phone;
    const buyer = buyers.get(email) ?? { email, name: buyerName, phone: "", avatarUrl: null, account: true, joinedAt: user.created_at, orders: [], total: 0 };
    buyer.account = true;
    buyer.joinedAt = user.created_at;
    buyer.name = profile?.display_name || buyer.name || buyerName;
    buyer.phone = profile?.phone || buyer.phone || (typeof metadataPhone === "string" ? metadataPhone : "");
    buyer.avatarUrl = avatarByUserId.get(user.id) ?? null;
    buyers.set(email, buyer);
  }

  const needle = (query.q ?? "").trim().toLowerCase();
  const list = Array.from(buyers.values()).filter((buyer) => !needle || `${buyer.email} ${buyer.name} ${buyer.phone}`.toLowerCase().includes(needle));
  const orderCount = list.reduce((sum, buyer) => sum + buyer.orders.length, 0);
  const totalSales = list.reduce((sum, buyer) => sum + buyer.total, 0);
  const accountCount = list.filter((buyer) => buyer.account).length;
  return <AdminShell active="customers" access={access}><div className="admin-content">
    <div className="admin-page-title"><div><p className="admin-kicker">CUSTOMER RELATIONSHIPS</p><h1>Customers.</h1><p>View customer profiles, contact details, accounts, and complete order history.</p></div></div>
    {error && <p className="admin-notice error" role="alert">Customer order records could not be loaded.</p>}
    <section className="admin-stats"><article><span>Customers</span><b>{buyers.size}</b><small>Registered accounts and guest buyers</small><i>♙</i></article><article><span>Customer accounts</span><b>{accountCount}</b><small>Among customers shown</small><i>◎</i></article><article><span>Orders in view</span><b>{orderCount}</b><small>From the latest 1,000 orders</small><i>▤</i></article><article><span>Order value</span><b>{money(totalSales)}</b><small>For customers shown</small><i><ArrowIcon /></i></article></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">BUYER DIRECTORY</p><h2>{list.length} customers</h2></div><form className="admin-search-form" action="/admin/customers"><label className="sr-only" htmlFor="customer-search">Search customers</label><input id="customer-search" name="q" defaultValue={query.q ?? ""} placeholder="Search email, name, phone" /><button className="admin-secondary-button" type="submit">Search</button></form></div>
      {list.length === 0 ? <div className="admin-orders-empty">{needle ? "No customers match that search." : "Customer accounts and guest buyers will appear here."}</div> : <div className="admin-table-wrap"><table className="admin-table customer-table"><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>ACCOUNT</th><th>ORDERS</th><th>ORDER VALUE</th><th>LAST ORDER</th><th>HISTORY</th></tr></thead><tbody>{list.map((buyer) => <tr key={buyer.email}><td><div className="customer-directory-identity">{buyer.avatarUrl ? <img src={buyer.avatarUrl} alt={`${buyer.name} profile`} /> : <span>{buyer.name.slice(0, 1).toUpperCase()}</span>}<div><b>{buyer.name}</b><small>{buyer.email}</small></div></div></td><td>{buyer.phone || "—"}</td><td>{buyer.account ? <span className="customer-account-badge">Account</span> : <span className="customer-guest-badge">Guest</span>}{buyer.joinedAt && <small className="customer-joined-date">Joined {formatDate(buyer.joinedAt)}</small>}</td><td>{buyer.orders.length}</td><td><b>{money(buyer.total)}</b></td><td>{buyer.orders[0] ? formatDate(buyer.orders[0].created_at) : "—"}</td><td>{buyer.orders.length ? <AdminCustomerOrderHistory email={buyer.email} orders={buyer.orders} /> : <span className="customer-no-orders">No orders yet</span>}</td></tr>)}</tbody></table></div>}
    </section><p className="admin-page-footnote"><Link href="/admin/orders">Manage orders <ArrowIcon /></Link></p>
  </div></AdminShell>;
}
