"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

export type OrderTrackingEvent = { status: string; note: string | null; created_at: string };
export type TrackedOrder = {
  reference: string;
  status: string;
  created_at: string;
  carrier: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  events: OrderTrackingEvent[];
};
export type TrackingState = { error: "not_found" | "rate_limited" | "service" | null; order: TrackedOrder | null };

export async function trackGuestOrder(_previous: TrackingState, formData: FormData): Promise<TrackingState> {
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!/^AP-[A-F0-9]{16}$/.test(reference) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, "").length < 7) {
    return { error: "not_found", order: null };
  }

  try {
    const requestHeaders = await headers();
    const ip = (requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? "unknown").split(",")[0].trim();
    const ipHash = createHash("sha256").update(ip).digest("hex");
    const { data, error } = await createServiceClient().rpc("track_guest_order", {
      p_reference: reference,
      p_email: email,
      p_phone: phone,
      p_ip_hash: ipHash,
    });
    if (error || !data) return { error: "service", order: null };
    if (data.error === "rate_limited") return { error: "rate_limited", order: null };
    if (data.error || !data.reference) return { error: "not_found", order: null };
    return { error: null, order: data as TrackedOrder };
  } catch {
    return { error: "service", order: null };
  }
}
