import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import ExportButtons from "@/components/export-buttons";
import ContabilidadTabs from "../contabilidad-tabs";
import DateRangeFilter from "../date-range-filter";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default async function BalanceSumasSaldosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { desde, hasta } = await searchParams;
  const supabase = await createClient();

  const { data: cuentasList } = await supabase
    .from("plan_cuentas")
    .select("id, codigo, nombre")
    .eq("imputable", true)
    .order("codigo");

  let query = supabase
    .from("asiento_lineas")
    .select("debe, haber, cuenta_id, asientos!inner(fecha, anulado)")
    .eq("asientos.anulado", false);
  if (desde) query = query.gte("asientos.fecha", desde);
  if (hasta) query = query.lte("asientos.fecha", hasta);
  const { data: lineas } = await query;

  const porCuenta = new Map<string, { codigo: string; nombre: string; debe: number; haber: number }>();
  for (const c of cuentasList ?? []) porCuenta.set(c.id, { codigo: c.codigo, nombre: c.nombre, debe: 0, haber: 0 });
  for (const l of lineas ?? []) {
    const acc = porCuenta.get(l.cuenta_id);
    if (!acc) continue;
    acc.debe += Number(l.debe);
    acc.haber += Number(l.haber);
  }

  const filas = Array.from(porCuenta.values())
    .filter((c) => c.debe !== 0 || c.haber !== 0)
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .map((c) => ({
      ...c,
      saldoDeudor: c.debe > c.haber ? c.debe - c.haber : 0,
      saldoAcreedor: c.haber > c.debe ? c.haber - c.debe : 0,
    }));

  const totales = filas.reduce(
    (acc, f) => ({
      debe: acc.debe + f.debe,
      haber: acc.haber + f.haber,
      saldoDeudor: acc.saldoDeudor + f.saldoDeudor,
      saldoAcreedor: acc.saldoAcreedor + f.saldoAcreedor,
    }),
    { debe: 0, haber: 0, saldoDeudor: 0, saldoAcreedor: 0 }
  );

  const exportRows = filas.map((f) => [
    f.codigo,
    f.nombre,
    fmt(f.debe),
    fmt(f.haber),
    fmt(f.saldoDeudor),
    fmt(f.saldoAcreedor),
  ]);
  exportRows.push([
    "",
    "TOTALES",
    fmt(totales.debe),
    fmt(totales.haber),
    fmt(totales.saldoDeudor),
    fmt(totales.saldoAcreedor),
  ]);

  return (
    <div>
      <PageTitle>Contabilidad</PageTitle>
      <ContabilidadTabs />
      <DateRangeFilter>
        <ExportButtons
          filename="balance-sumas-y-saldos"
          title="Balance de Sumas y Saldos"
          headers={["Código", "Cuenta", "Suma Debe", "Suma Haber", "Saldo Deudor", "Saldo Acreedor"]}
          rows={exportRows}
        />
      </DateRangeFilter>

      <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-bg">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Código</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Cuenta</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Suma Debe</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Suma Haber</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Saldo Deudor</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Saldo Acreedor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filas.map((f) => (
              <tr key={f.codigo}>
                <td className="px-3 py-2 text-ink-soft">{f.codigo}</td>
                <td className="px-3 py-2 text-ink">{f.nombre}</td>
                <td className="px-3 py-2 text-right text-ink-soft">{fmt(f.debe)}</td>
                <td className="px-3 py-2 text-right text-ink-soft">{fmt(f.haber)}</td>
                <td className="px-3 py-2 text-right text-ink">{f.saldoDeudor > 0 ? fmt(f.saldoDeudor) : ""}</td>
                <td className="px-3 py-2 text-right text-ink">{f.saldoAcreedor > 0 ? fmt(f.saldoAcreedor) : ""}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-soft">
                  Sin movimientos en el período
                </td>
              </tr>
            )}
          </tbody>
          {filas.length > 0 && (
            <tfoot className="bg-bg font-semibold">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-right text-ink">
                  Totales
                </td>
                <td className="px-3 py-2 text-right text-ink">{fmt(totales.debe)}</td>
                <td className="px-3 py-2 text-right text-ink">{fmt(totales.haber)}</td>
                <td className="px-3 py-2 text-right text-ink">{fmt(totales.saldoDeudor)}</td>
                <td className="px-3 py-2 text-right text-ink">{fmt(totales.saldoAcreedor)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
