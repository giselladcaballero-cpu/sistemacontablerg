export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map((r) => r.map(escape).join(";"));
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToPdf(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(13);
  doc.text(title, 14, 15);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((v) => String(v ?? ""))),
    startY: 20,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 92, 72] },
  });
  doc.save(`${filename}.pdf`);
}
