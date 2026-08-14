import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

const NOMBRES: Record<string, string> = {
  iva: "IVA",
  ganancias: "Ganancias",
  iibb: "Ingresos Brutos",
  suss: "SUSS",
};

export default async function RetencionesPage() {
  const supabase = await createClient();
  const { data: retenciones } = await supabase
    .from("v_retenciones")
    .select("*")
    .order("fecha", { ascending: false });

  const totalesPorTipo = ["iva", "ganancias", "iibb", "suss"].map((tipo) => ({
    tipo,
    total: (retenciones ?? [])
      .filter((r) => r.tipo === tipo)
      .reduce((s, r) => s + Number(r.importe), 0),
  }));

  return (
    <div>
      <PageTitle className="mb-6">Retenciones</PageTitle>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {totalesPorTipo.map((t) => (
          <div key={t.tipo} className="rounded-lg border bg-surface p-4 shadow-sm">
            <p className="text-xs text-ink-soft">Retención {NOMBRES[t.tipo]}</p>
            <p className="mt-1 text-xl font-semibold text-ink">{fmt(t.total)}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-bg">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Fecha</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Orden de Pago</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Proveedor</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">CUIT</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Tipo</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(retenciones ?? []).map((r, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 text-ink-soft">{r.fecha}</td>
                <td className="px-3 py-2 text-ink-soft">#{r.numero}</td>
                <td className="px-3 py-2 text-ink">{r.proveedor}</td>
                <td className="px-3 py-2 text-ink-soft">{r.cuit ?? "-"}</td>
                <td className="px-3 py-2 capitalize text-ink-soft">{NOMBRES[r.tipo] ?? r.tipo}</td>
                <td className="px-3 py-2 text-right text-ink">{fmt(Number(r.importe))}</td>
              </tr>
            ))}
            {(retenciones ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-soft">
                  Sin retenciones todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
