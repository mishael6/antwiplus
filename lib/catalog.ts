import type { CartProduct } from "@/components/cart";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
export { formatPrice } from "@/lib/currency";

export type StoreProduct = CartProduct & {
  description: string | null;
  compare_at_pesewas: number | null;
  tag: string | null;
};

export async function getStoreProducts(): Promise<StoreProduct[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("products")
      .select("id,slug,name,category,description,price_pesewas,compare_at_pesewas,stock_quantity,image_url,visual,tag")
      .eq("is_active", true).order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as StoreProduct[];
  } catch {
    return [];
  }
}

export async function getStoreProduct(slug: string) {
  const products = await getStoreProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

