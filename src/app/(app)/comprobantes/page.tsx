import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import ComprobanteRow from "./comprobante-row";

export default async function ComprobantesPage() {
  const supabase = await createClient();
  const { data: comprobantes } = await supabase
    .from("comprobantes")
    .select("*, terceros(razon_social)")
    .order("fecha", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle>Comprobantes</PageTitle>
        <Link
          href="/comprobantes/nuevo"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90"
        >
          + Nuevo Comprobante
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-bg">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Fecha</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">N°</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Tercero</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Dirección</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Total</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Estado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(comprobantes ?? []).map((c) => (
              <ComprobanteRow
                key={c.id}
                comprobante={c}
                terceroNombre={(c.terceros as { razon_social: string } | null)?.razon_social ?? "-"}
              />
            ))}
            {(comprobantes ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-ink-soft">
                  Sin comprobantes todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
