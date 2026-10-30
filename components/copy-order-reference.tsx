"use client";

import { useState } from "react";

export function CopyOrderReference({ reference }: { reference: string }) {
  const [label, setLabel] = useState("Copy");

  async function copyReference() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reference);
      } else {
        const field = document.createElement("textarea");
        field.value = reference;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Copy failed");
      }
      setLabel("Copied!");
    } catch {
      setLabel("Copy failed");
    }
    window.setTimeout(() => setLabel("Copy"), 1800);
  }

  return <button type="button" className="copy-order-reference" onClick={copyReference} aria-label={`Copy order reference ${reference}`}>
    {label === "Copied!" ? "✓ Copied!" : label === "Copy failed" ? "Try again" : "Copy"}
  </button>;
}
