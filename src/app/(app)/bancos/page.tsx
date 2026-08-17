import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import { Card, KpiCard, Table, Th, pesos } from "@/components/ui";
import { SortableTh } from "@/components/sortable-th";
import CuentaBancariaForm from "./cuenta-form";
import MovimientoForm from "./movimiento-form";
import CuentaBancariaRow from "./cuenta-row";
import MovimientoRow from "./movimiento-row";
import BancosFiltros from "./bancos-filtros";

const SORT_COLUMN: Record<string, string> = {
  fecha: "fecha",
  importe: "importe",
};

export default async function BancosPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; cuenta?: string; tipo?: string }>;
}) {
  const { sort, dir, cuenta, tipo } = await searchParams;
  const supabase = await createClient();
  const empresa = await getEmpresaActual();

  let movQuery = supabase.from("movimientos_bancarios").select("*, cuentas_bancarias(nombre)").limit(200);
  if (cuenta) movQuery = movQuery.eq("cuenta_bancaria_id", cuenta);
  if (tipo) movQuery = movQuery.eq("tipo", tipo);
  const column = (sort && SORT_COLUMN[sort]) || "fecha";
  const ascending = sort ? dir === "asc" : false;
  movQuery = movQuery.order(column, { ascending });

  const [{ data: saldos }, { data: cuentas }, { data: movimientos }] = await Promise.all([
    supabase.from("v_saldos_bancarios").select("*"),
    supabase.from("cuentas_bancarias").select("*").eq("activa", true).order("nombre"),
    movQuery,
  ]);

  return (
    <div className="space-y-6">
      <PageTitle>Bancos y Caja</PageTitle>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(215px,1fr))]">
        {(saldos ?? []).map((c) => (
          <KpiCard
            key={c.id}
            label={`${c.nombre}${c.banco ? ` · ${c.banco}` : ""}`}
            value={pesos(Number(c.saldo_actual))}
            tone={Number(c.saldo_actual) < 0 ? "bad" : "accent"}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <CuentaBancariaForm empresaId={empresa!.id} />
          {(cuentas ?? []).length > 0 && (
            <div className="space-y-2">
              {(cuentas ?? []).map((c) => (
                <CuentaBancariaRow key={c.id} cuenta={c} />
              ))}
            </div>
          )}
          <MovimientoForm cuentas={cuentas ?? []} />
        </div>
        <div className="lg:col-span-2">
          <BancosFiltros cuentas={cuentas ?? []} />
          <Card>
            <Table>
              <thead>
                <tr>
                  <SortableTh field="fecha" defaultDir="desc">
                    Fecha
                  </SortableTh>
                  <Th>Cuenta</Th>
                  <Th>Descripción</Th>
                  <SortableTh field="importe" right defaultDir="desc">
                    Importe
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {(movimientos ?? []).map((m) => (
                  <MovimientoRow
                    key={m.id}
                    movimiento={m}
                    cuentaNombre={(m.cuentas_bancarias as { nombre: string } | null)?.nombre ?? "-"}
                  />
                ))}
                {(movimientos ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                      Sin movimientos que coincidan
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
