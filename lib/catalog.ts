import type { CartProduct, StoreColorVariant } from "@/components/cart";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { STORE_CATEGORIES } from "@/lib/store-categories";
export { formatPrice } from "@/lib/currency";

export type StoreProduct = CartProduct & {
  description: string | null;
  compare_at_pesewas: number | null;
  tag: string | null;
  brand: string | null;
  variants: StoreColorVariant[];
};

export async function getStoreProducts(): Promise<StoreProduct[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("products")
      .select("id,slug,name,category,brand,description,price_pesewas,compare_at_pesewas,stock_quantity,image_url,tag")
      .eq("is_active", true).order("created_at", { ascending: false });
    if (error || !data) return [];
    if (!data.length) return [];
    const { data: variants } = await supabase.from("product_color_variants").select("id,product_id,name,hex,image_url,sort_order,created_at").in("product_id", data.map((product) => product.id)).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    return data.map((product) => ({ ...product, variants: (variants ?? []).filter((variant) => variant.product_id === product.id).map(({ id, name, hex, image_url }) => ({ id, name, hex, image_url })) })) as StoreProduct[];
  } catch {
    return [];
  }
}

export async function getStoreProduct(slug: string) {
  const products = await getStoreProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getStoreCategories(): Promise<string[]> {
  const categories = new Map<string, string>(STORE_CATEGORIES.map((category) => [category.toLowerCase(), category]));
  if (!isSupabaseConfigured()) return [...categories.values()];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("products").select("category").eq("is_active", true);
    for (const row of data ?? []) {
      const category = typeof row.category === "string" ? row.category.trim() : "";
      if (category && !categories.has(category.toLowerCase())) categories.set(category.toLowerCase(), category);
    }
  } catch {
    // Use the built-in categories when the product catalog is unavailable.
  }
  return [...categories.values()];
}
