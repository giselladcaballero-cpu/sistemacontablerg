import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import { Card, KpiCard, Table, Th, pesos } from "@/components/ui";

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

      <div className="mb-6 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(215px,1fr))]">
        {totalesPorTipo.map((t) => (
          <KpiCard key={t.tipo} label={`Retención ${NOMBRES[t.tipo]}`} value={pesos(t.total)} tone="plum" />
        ))}
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Orden de Pago</Th>
              <Th>Proveedor</Th>
              <Th>CUIT</Th>
              <Th>Tipo</Th>
              <Th right>Importe</Th>
            </tr>
          </thead>
          <tbody>
            {(retenciones ?? []).map((r, idx) => (
              <tr key={idx} className="border-b border-line hover:bg-accent/5">
                <td className="px-3 py-2 font-mono text-[11px] text-ink-2">{r.fecha}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-ink-2">#{r.numero}</td>
                <td className="px-3 py-2 text-[12.5px] text-ink">{r.proveedor}</td>
                <td className="px-3 py-2 text-[12.5px] text-ink-2">{r.cuit ?? "-"}</td>
                <td className="px-3 py-2 text-[12.5px] capitalize text-ink-2">{NOMBRES[r.tipo] ?? r.tipo}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{pesos(Number(r.importe))}</td>
              </tr>
            ))}
            {(retenciones ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                  Sin retenciones todavía
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
