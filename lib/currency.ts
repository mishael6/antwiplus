export function formatPrice(pesewas: number) {
  return `GH₵ ${(Number(pesewas) / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
