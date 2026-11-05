"use client";

import { deleteProduct } from "@/app/admin/actions";

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  return <form action={deleteProduct} onSubmit={(event) => {
    if (!window.confirm(`Permanently delete “${productName}”? This cannot be undone.`)) event.preventDefault();
  }}>
    <input type="hidden" name="id" value={productId} />
    <button className="table-action product-delete-button" type="submit">Delete</button>
  </form>;
}
