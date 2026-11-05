import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

export async function getOrCreateReferralCode(ownerId: string): Promise<string | null> {
  try {
    const service = createServiceClient();
    const { data: existing } = await service.from("customer_referral_codes").select("code").eq("owner_id", ownerId).maybeSingle();
    if (existing?.code) return existing.code;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = `AP${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
      const { error } = await service.from("customer_referral_codes").insert({ owner_id: ownerId, code });
      if (!error) return code;
      if (error.code !== "23505") break;
      const { data: raced } = await service.from("customer_referral_codes").select("code").eq("owner_id", ownerId).maybeSingle();
      if (raced?.code) return raced.code;
    }
  } catch {
    // Referral links stay unavailable until the referral tables are installed.
  }
  return null;
}

export async function recordCustomerReferralEvent({
  code,
  eventType,
  referredUserId,
  orderId,
}: {
  code: string;
  eventType: "visit" | "signup" | "order";
  referredUserId?: string | null;
  orderId?: string | null;
}) {
  try {
    const service = createServiceClient();
    const { data: referral } = await service.from("customer_referral_codes").select("owner_id").eq("code", code.toUpperCase()).maybeSingle();
    if (!referral || (referredUserId && referral.owner_id === referredUserId)) return null;
    const { error } = await service.from("customer_referral_events").insert({
      owner_id: referral.owner_id,
      code: code.toUpperCase(),
      event_type: eventType,
      referred_user_id: referredUserId ?? null,
      event_key: orderId ? createHash("sha256").update(orderId).digest("hex") : null,
    });
    return error ? null : referral.owner_id;
  } catch {
    return null;
  }
}
