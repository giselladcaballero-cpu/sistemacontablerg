import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import ExportButtons from "@/components/export-buttons";
import { Card, Table, Th } from "@/components/ui";
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

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Cuenta</Th>
              <Th right>Suma Debe</Th>
              <Th right>Suma Haber</Th>
              <Th right>Saldo Deudor</Th>
              <Th right>Saldo Acreedor</Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.codigo} className="border-b border-line hover:bg-accent/5">
                <td className="px-3 py-2 font-mono text-[11px] text-ink-2">{f.codigo}</td>
                <td className="px-3 py-2 text-[12.5px] text-ink">{f.nombre}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink-2">{fmt(f.debe)}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink-2">{fmt(f.haber)}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{f.saldoDeudor > 0 ? fmt(f.saldoDeudor) : ""}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{f.saldoAcreedor > 0 ? fmt(f.saldoAcreedor) : ""}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                  Sin movimientos en el período
                </td>
              </tr>
            )}
          </tbody>
          {filas.length > 0 && (
            <tfoot className="bg-surface-2 font-semibold">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-right text-[12.5px] text-ink">
                  Totales
                </td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{fmt(totales.debe)}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{fmt(totales.haber)}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{fmt(totales.saldoDeudor)}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{fmt(totales.saldoAcreedor)}</td>
              </tr>
            </tfoot>
          )}
        </Table>
      </Card>
    </div>
  );
}
