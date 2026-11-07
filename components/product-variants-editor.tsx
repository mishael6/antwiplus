"use client";

import { useState, type ChangeEvent } from "react";

type Variant = { id?: string; name: string; hex: string; image_url?: string | null };

function VariantImage({ index, initialUrl }: { index: number; initialUrl?: string | null }) {
  const [preview, setPreview] = useState(initialUrl ?? "");
  const [fileName, setFileName] = useState("");
  function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : initialUrl ?? "");
    reader.readAsDataURL(file);
  }
  return <div className="variant-image-picker">
    <div className="variant-image-preview">{preview ? <img src={preview} alt="Color option preview" /> : <span>＋</span>}</div>
    <label className="admin-secondary-button">{fileName || (initialUrl ? "Replace photo" : "Upload this color photo")}<input name={`color_image_${index}`} type="file" accept="image/jpeg,image/png,image/webp" required={!initialUrl} onChange={select} /></label>
  </div>;
}

export function ProductVariantsEditor({ initialVariants = [] }: { initialVariants?: Variant[] }) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  function update(index: number, changes: Partial<Variant>) {
    setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }
  function remove(index: number) { setVariants((items) => items.filter((_, itemIndex) => itemIndex !== index)); }
  return <section className="admin-panel product-variants-panel">
    <div className="admin-panel-heading"><div><p className="admin-kicker">OPTIONAL PRODUCT OPTIONS</p><h2>Colors and photos</h2></div><span className="variant-count">{variants.length} {variants.length === 1 ? "color" : "colors"}</span></div>
    <p className="variant-help">Add each additional available color with its own photo. The main product photo appears first when you add color options.</p>
    <input type="hidden" name="variant_count" value={variants.length} />
    <div className="product-variant-list">{variants.map((variant, index) => <article className="product-variant-card" key={`${variant.id ?? "new"}-${index}`}>
      <input type="hidden" name={`color_id_${index}`} value={variant.id ?? ""} />
      <input type="hidden" name={`color_existing_image_${index}`} value={variant.image_url ?? ""} />
      <div className="variant-fields"><label>Color name<input name={`color_name_${index}`} required maxLength={40} value={variant.name} onChange={(event) => update(index, { name: event.target.value })} placeholder="e.g. Midnight blue" /></label><label>Color swatch<span className="color-input-wrap"><input name={`color_hex_${index}`} aria-label={`Color swatch ${index + 1}`} type="color" value={variant.hex || "#245b86"} onChange={(event) => update(index, { hex: event.target.value })} /><small>{variant.hex || "#245b86"}</small></span></label></div>
      <VariantImage key={`${variant.id ?? "new"}-${index}`} index={index} initialUrl={variant.image_url} />
      <button className="variant-remove-button" type="button" onClick={() => remove(index)}>Remove color</button>
    </article>)}</div>
    {variants.length < 10 && <button className="variant-add-button" type="button" onClick={() => setVariants((items) => [...items, { name: "", hex: "#245b86", image_url: null }])}>＋ Add another color</button>}
  </section>;
}
