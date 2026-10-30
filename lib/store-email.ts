import "server-only";

type OrderEmail = {
  to: string;
  name: string;
  reference: string;
  title: string;
  message: string;
  details?: Array<{ label: string; value: string }>;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);

export async function sendStoreEmail(email: OrderEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.STORE_EMAIL_FROM;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !from || !siteUrl) return false;

  const detailRows = (email.details ?? []).map(({ label, value }) => `<tr><td style="padding:8px 12px;color:#687789;border-bottom:1px solid #e7edf3">${escapeHtml(label)}</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e7edf3;color:#26384a">${escapeHtml(value)}</td></tr>`).join("");
  const trackingUrl = `${siteUrl.replace(/\/$/, "")}/track-order`;
  const html = `<div style="margin:0;background:#f5f8fb;padding:32px 12px;font-family:Arial,sans-serif;color:#26384a"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4eaf0;padding:28px"><p style="margin:0 0 12px;color:#28639b;font-size:12px;font-weight:bold;letter-spacing:2px">ANTWIPLUS</p><h1 style="margin:0 0 14px;font-size:24px">${escapeHtml(email.title)}</h1><p style="font-size:14px;line-height:1.7">Hi ${escapeHtml(email.name || "there")}, ${escapeHtml(email.message)}</p><p style="font-size:12px;color:#69788a">Order reference: <strong style="color:#26384a">${escapeHtml(email.reference)}</strong></p>${detailRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:18px 0">${detailRows}</table>` : ""}<p style="margin:22px 0"><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;padding:12px 17px;background:#245f97;color:#fff;text-decoration:none;font-size:13px">Track your order</a></p><p style="font-size:11px;line-height:1.7;color:#7b8795">Keep your order reference. Guest customers will also need the email address and phone number used at checkout to track an order.</p></div></div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email.to], subject: email.title, html }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function sendOrderConfirmationEmail(input: { to: string; name: string; reference: string }) {
  return sendStoreEmail({
    ...input,
    title: "We’ve received your order",
    message: "we have your order and our team will contact you to confirm the delivery details.",
  });
}

export function sendOrderUpdateEmail(input: { to: string; name: string; reference: string; status: string; carrier: string | null; trackingCode: string | null; trackingUrl: string | null }) {
  const details = [
    { label: "Order status", value: input.status.replaceAll("_", " ") },
    ...(input.carrier ? [{ label: "Courier", value: input.carrier }] : []),
    ...(input.trackingCode ? [{ label: "Courier reference", value: input.trackingCode }] : []),
    ...(input.trackingUrl ? [{ label: "Courier tracking link", value: input.trackingUrl }] : []),
  ];
  return sendStoreEmail({
    to: input.to,
    name: input.name,
    reference: input.reference,
    title: "Your order has an update",
    message: "there has been a change to your order. Here are the latest details.",
    details,
  });
}
