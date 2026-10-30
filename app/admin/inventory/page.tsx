import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { updateProductStock } from "../actions";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  const [{ access }, query] = await Promise.all([requireAdmin("inventory"), searchParams]);
  const { data, error } = await createServiceClient().from("products").select("id,name,slug,category,stock_quantity,is_active,updated_at").order("stock_quantity", { ascending: true });
  const products = data ?? [];
  const lowStock = products.filter((product) => product.stock_quantity > 0 && product.stock_quantity <= 5);
  const outOfStock = products.filter((product) => product.stock_quantity === 0);
  return <AdminShell active="inventory" access={access}><div className="admin-content">
    <div className="admin-page-title"><div><p className="admin-kicker">STOCK CONTROL</p><h1>Inventory.</h1><p>Keep product quantities accurate and catch low stock before it affects sales.</p></div><Link className="admin-primary-button" href="/admin/products/new">＋ Add product</Link></div>
    {query.updated && <p className="admin-notice success" role="status">Inventory quantity saved.</p>}{query.error && <p className="admin-notice error" role="alert">{query.error === "invalid" ? "Enter a whole number from 0 to 1,000,000." : "We couldn’t update that stock quantity."}</p>}{error && <p className="admin-notice error" role="alert">Couldn’t load product inventory. Check the database connection.</p>}
    <section className="admin-stats inventory-stats"><article><span>Catalog items</span><b>{products.length}</b><small>Across all products</small><i>▣</i></article><article><span>Low stock</span><b>{lowStock.length}</b><small>Five units or fewer</small><i>!</i></article><article><span>Out of stock</span><b>{outOfStock.length}</b><small>Unavailable to shoppers</small><i>×</i></article></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">QUANTITY AT A GLANCE</p><h2>Stock by product</h2></div></div>
      {!products.length ? <div className="admin-empty"><h3>No products to manage yet.</h3><p>Add products to see stock levels here.</p><Link className="admin-primary-button" href="/admin/products/new">Add your first product ↗</Link></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>AVAILABILITY</th><th>QUANTITY</th><th>ADJUST STOCK</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>/{product.slug}</small></td><td>{product.category}</td><td><span className={`status-pill ${product.stock_quantity === 0 ? "draft" : product.stock_quantity <= 5 ? "warning" : "live"}`}>{product.stock_quantity === 0 ? "Out of stock" : product.stock_quantity <= 5 ? "Low stock" : "In stock"}</span></td><td><b>{product.stock_quantity}</b></td><td><form action={updateProductStock} className="inventory-adjust-form"><input type="hidden" name="id" value={product.id} /><label className="sr-only" htmlFor={`stock-${product.id}`}>New stock quantity for {product.name}</label><input id={`stock-${product.id}`} type="number" name="stock_quantity" min="0" max="1000000" step="1" defaultValue={product.stock_quantity} required /><button className="table-action" type="submit">Save</button></form></td></tr>)}</tbody></table></div>}
    </section><p className="admin-page-footnote"><Link href="/admin/products">← Back to products</Link></p>
  </div></AdminShell>;
}
