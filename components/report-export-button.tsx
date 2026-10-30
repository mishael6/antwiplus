"use client";

type ExportRow = { date: string; order: string; email: string; status: string; product: string; quantity: number; lineValue: number };

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function ReportExportButton({ rows }: { rows: ExportRow[] }) {
  function download() {
    const content = [
      ["Date", "Order", "Customer email", "Status", "Product", "Quantity", "Line value (pesewas)"].map(csvCell).join(","),
      ...rows.map((row) => [row.date, row.order, row.email, row.status, row.product, row.quantity, row.lineValue].map(csvCell).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `antwiplus-sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <button className="admin-primary-button" type="button" onClick={download} disabled={!rows.length}>Export CSV <span>↓</span></button>;
}
