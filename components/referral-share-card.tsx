"use client";

import { useEffect, useState } from "react";

export function ReferralShareCard({ code, visits, signups, orders }: { code: string; visits: number; signups: number; orders: number }) {
  const [url, setUrl] = useState(`/r/${code}`);
  const [message, setMessage] = useState("");

  useEffect(() => setUrl(`${window.location.origin}/r/${code}`), [code]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url.startsWith("/") ? `${window.location.origin}${url}` : url);
      setMessage("Your link is copied and ready to share.");
    } catch {
      setMessage("Copy wasn’t available here. Select and copy the link above.");
    }
  }

  async function shareLink() {
    const shareUrl = url.startsWith("/") ? `${window.location.origin}${url}` : url;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Discover AntwiPlus", text: "Take a look at the finds at AntwiPlus.", url: shareUrl });
      } catch {
        // The visitor may close the native share sheet without sharing.
      }
    } else {
      await copyLink();
    }
  }

  return <section className="referral-card" aria-labelledby="referral-title"><div className="referral-main"><span className="referral-mark" aria-hidden="true">↗</span><div><p className="admin-kicker">PASS IT ALONG</p><h2 id="referral-title">Share AntwiPlus with a friend.</h2><p>Send your personal link so friends can explore the store, create an account, or shop as a guest.</p></div></div><div className="referral-share-row"><label htmlFor="customer-referral-link">Your personal link</label><div><input id="customer-referral-link" readOnly value={url} onFocus={(event) => event.currentTarget.select()} /><button type="button" className="referral-copy-button" onClick={copyLink}>Copy link</button><button type="button" className="referral-share-button" onClick={shareLink}>Share ↗</button></div>{message && <small role="status">{message}</small>}</div><div className="referral-stats" aria-label="Referral activity"><div><b>{visits}</b><span>Link visits</span></div><div><b>{signups}</b><span>Accounts created</span></div><div><b>{orders}</b><span>Orders placed</span></div></div><p className="referral-code-note">Referral code <b>{code}</b> · Activity updates when someone visits your link, signs up, or places an order.</p></section>;
}
