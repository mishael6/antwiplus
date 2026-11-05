"use client";

import { useState, type ChangeEvent } from "react";

export function ProductImageUpload({ initialImageUrl, required = false }: { initialImageUrl?: string | null; required?: boolean }) {
  const [preview, setPreview] = useState(initialImageUrl ?? "");
  const [fileName, setFileName] = useState("");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : initialImageUrl ?? "");
    reader.readAsDataURL(file);
  }

  return <div className="product-image-upload">
    <div className="product-image-preview">{preview ? <img src={preview} alt="Product image preview" /> : <span aria-hidden="true">＋</span>}</div>
    <div className="product-image-picker-copy"><b>{fileName || (initialImageUrl ? "Current product image" : "Add a product image")}</b><small>JPG, PNG or WebP · up to 5 MB</small><label className="admin-secondary-button">{fileName ? "Choose a different image" : initialImageUrl ? "Replace image" : "Choose image"}<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required={required} onChange={handleChange} /></label></div>
  </div>;
}
