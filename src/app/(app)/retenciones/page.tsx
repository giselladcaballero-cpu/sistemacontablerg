import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import { Card, KpiCard, Table, Th, pesos } from "@/components/ui";
import { SortableTh } from "@/components/sortable-th";
import RetencionesFiltros from "./retenciones-filtros";

const NOMBRES: Record<string, string> = {
  iva: "IVA",
  ganancias: "Ganancias",
  iibb: "Ingresos Brutos",
  suss: "SUSS",
};

export default async function RetencionesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; tipo?: string }>;
}) {
  const { sort, dir, tipo } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("v_retenciones").select("*");

  const totalesPorTipo = ["iva", "ganancias", "iibb", "suss"].map((t) => ({
    tipo: t,
    total: (data ?? []).filter((r) => r.tipo === t).reduce((s, r) => s + Number(r.importe), 0),
  }));

  let retenciones = (data ?? []).filter((r) => !tipo || r.tipo === tipo);

  const campo = sort ?? "fecha";
  const ascending = sort ? dir === "asc" : false;
  retenciones = [...retenciones].sort((a, b) => {
    let cmp = 0;
    if (campo === "proveedor") cmp = a.proveedor.localeCompare(b.proveedor);
    else if (campo === "importe") cmp = Number(a.importe) - Number(b.importe);
    else if (campo === "tipo") cmp = (NOMBRES[a.tipo] ?? a.tipo).localeCompare(NOMBRES[b.tipo] ?? b.tipo);
    else cmp = a.fecha.localeCompare(b.fecha);
    return ascending ? cmp : -cmp;
  });

  return (
    <div>
      <PageTitle className="mb-6">Retenciones</PageTitle>

      <div className="mb-6 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(215px,1fr))]">
        {totalesPorTipo.map((t) => (
          <KpiCard key={t.tipo} label={`Retención ${NOMBRES[t.tipo]}`} value={pesos(t.total)} tone="plum" />
        ))}
      </div>

      <RetencionesFiltros />
      <Card>
        <Table>
          <thead>
            <tr>
              <SortableTh field="fecha" defaultDir="desc">
                Fecha
              </SortableTh>
              <Th>Orden de Pago</Th>
              <SortableTh field="proveedor">Proveedor</SortableTh>
              <Th>CUIT</Th>
              <SortableTh field="tipo">Tipo</SortableTh>
              <SortableTh field="importe" right defaultDir="desc">
                Importe
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {retenciones.map((r, idx) => (
              <tr key={idx} className="border-b border-line hover:bg-accent/5">
                <td className="px-3 py-2 font-mono text-[11px] text-ink-2">{r.fecha}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-ink-2">#{r.numero}</td>
                <td className="px-3 py-2 text-[12.5px] text-ink">{r.proveedor}</td>
                <td className="px-3 py-2 text-[12.5px] text-ink-2">{r.cuit ?? "-"}</td>
                <td className="px-3 py-2 text-[12.5px] capitalize text-ink-2">{NOMBRES[r.tipo] ?? r.tipo}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{pesos(Number(r.importe))}</td>
              </tr>
            ))}
            {retenciones.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                  Sin retenciones que coincidan
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
