import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin";
import { toggleProduct } from "../actions";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const [{ supabase, access }, { created }] = await Promise.all([requireAdmin("products"), searchParams]);
  const { data } = await supabase.from("products").select("id,name,slug,category,price_pesewas,stock_quantity,is_active,created_at").order("created_at", { ascending: false });
  const products = data ?? [];

  const money = (pesewas: number) => `GH₵ ${(Number(pesewas) / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
  return <AdminShell active="products" access={access}><div className="admin-content"><div className="admin-page-title"><div><p className="admin-kicker">YOUR CATALOG</p><h1>Products.</h1><p>Add products, update stock, and choose what appears in your shop.</p></div><Link className="admin-primary-button" href="/admin/products/new">＋ Add product</Link></div>
    {created && <p className="admin-notice success" role="status">Product added and published to your storefront.</p>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">{products.length} ITEMS</p><h2>All products</h2></div></div>
      {products.length === 0 ? <div className="admin-empty"><span>✳</span><h3>Your catalog is ready for its first product.</h3><p>Add an item and it will appear in the storefront.</p><Link className="admin-primary-button" href="/admin/products/new">＋ Add your first product</Link></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th /></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>/{product.slug}</small></td><td>{product.category}</td><td>{money(product.price_pesewas)}</td><td>{product.stock_quantity}</td><td><span className={`status-pill ${product.is_active ? "live" : "draft"}`}>{product.is_active ? "Live" : "Hidden"}</span></td><td><form action={toggleProduct}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="is_active" value={String(product.is_active)} /><button className="table-action">{product.is_active ? "Hide" : "Publish"}</button></form></td></tr>)}</tbody></table></div>}
    </section>
  </div></AdminShell>;
}
