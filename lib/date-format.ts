export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GH", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
}
