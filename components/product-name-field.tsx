"use client";

import { useState } from "react";
import { slugifyProductName } from "@/lib/product-slug";

export function ProductNameField() {
  const [name, setName] = useState("");
  const slug = slugifyProductName(name) || "product-name";
  return <><label>Product name<input name="name" required maxLength={140} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Everyday carry tote" /></label><p className="product-url-hint">Your product link <b>/products/{slug}</b> is created automatically.</p></>;
}
