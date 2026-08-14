"use client";

import { exportToExcel, exportToPdf } from "@/lib/export";

export default function ExportButtons({
  filename,
  title,
  headers,
  rows,
}: {
  filename: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => exportToExcel(filename, headers, rows)}
        disabled={rows.length === 0}
        className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted disabled:opacity-40"
      >
        Exportar a Excel
      </button>
      <button
        onClick={() => exportToPdf(filename, title, headers, rows)}
        disabled={rows.length === 0}
        className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted disabled:opacity-40"
      >
        Exportar a PDF
      </button>
    </div>
  );
}
