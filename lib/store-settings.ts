import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";

export type StoreSettings = { announcement: string; delivery_note: string; support_email: string; support_phone: string };
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  announcement: "Thoughtful finds for your everyday",
  delivery_note: "Delivery across Ghana",
  support_email: "",
  support_phone: "",
};

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  if (!process.env.SUPABASE_SECRET_KEY) return DEFAULT_STORE_SETTINGS;
  try {
    const { data, error } = await createServiceClient().from("store_settings").select("announcement,delivery_note,support_email,support_phone").eq("id", true).maybeSingle();
    if (error || !data) return DEFAULT_STORE_SETTINGS;
    return { ...DEFAULT_STORE_SETTINGS, ...data };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
});
