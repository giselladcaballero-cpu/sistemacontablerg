import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import { Card, Table, Th, Button, pesos } from "@/components/ui";
import { SortableTh } from "@/components/sortable-th";
import OrdenPagoRow from "./orden-pago-row";
import OrdenesPagoFiltros from "./ordenes-pago-filtros";

export default async function OrdenesPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; estado?: string }>;
}) {
  const { sort, dir, estado } = await searchParams;
  const supabase = await createClient();
  const [{ data: pendientes }, { data: ordenesData }] = await Promise.all([
    supabase
      .from("v_cuenta_corriente_terceros")
      .select("*")
      .in("tipo", ["proveedor", "ambos"])
      .gt("saldo_pendiente", 0)
      .order("saldo_pendiente", { ascending: false }),
    supabase.from("v_ordenes_pago").select("*").limit(50),
  ]);

  let ordenes = (ordenesData ?? []).filter((o) => !estado || o.estado === estado);
  const campo = sort ?? "fecha";
  const ascending = sort ? dir === "asc" : false;
  ordenes = [...ordenes].sort((a, b) => {
    let cmp = 0;
    if (campo === "proveedor") cmp = a.proveedor.localeCompare(b.proveedor);
    else if (campo === "importe_neto") cmp = Number(a.importe_neto) - Number(b.importe_neto);
    else cmp = a.fecha.localeCompare(b.fecha);
    return ascending ? cmp : -cmp;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle>Órdenes de Pago</PageTitle>
        <Link href="/ordenes-pago/nueva">
          <Button variant="primary">+ Nueva Orden de Pago</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Proveedores con saldo pendiente">
          <Table>
            <thead>
              <tr>
                <Th>Proveedor</Th>
                <Th right>Saldo pendiente</Th>
              </tr>
            </thead>
            <tbody>
              {(pendientes ?? []).map((p) => (
                <tr key={p.tercero_id} className="border-b border-line hover:bg-accent/5">
                  <td className="px-3 py-2 text-[12.5px] text-ink">{p.razon_social}</td>
                  <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{pesos(Number(p.saldo_pendiente))}</td>
                </tr>
              ))}
              {(pendientes ?? []).length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                    No hay facturas pendientes de pago
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        <Card title="Historial">
          <div className="px-[1.15rem] pt-3">
            <OrdenesPagoFiltros />
          </div>
          <Table>
            <thead>
              <tr>
                <SortableTh field="fecha" defaultDir="desc">
                  Fecha
                </SortableTh>
                <SortableTh field="proveedor">Proveedor</SortableTh>
                <Th>Cuenta</Th>
                <SortableTh field="importe_neto" right defaultDir="desc">
                  Neto pagado
                </SortableTh>
                <Th>Estado</Th>
                <Th right>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((o) => (
                <OrdenPagoRow key={o.id} orden={o} />
              ))}
              {ordenes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                    Sin órdenes de pago que coincidan
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
