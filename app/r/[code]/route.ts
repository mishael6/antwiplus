import { NextResponse } from "next/server";
import { recordCustomerReferralEvent } from "@/lib/customer-referrals";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();
  const validFormat = /^AP[A-F0-9]{8}$/.test(code);
  const response = NextResponse.redirect(new URL("/shop", request.url));
  if (!validFormat) return response;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ownerId = await recordCustomerReferralEvent({ code, eventType: "visit", referredUserId: user?.id });
  if (ownerId) response.cookies.set("antwiplus_referral", code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
