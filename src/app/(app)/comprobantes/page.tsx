import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import { Card, Table, Th, Button } from "@/components/ui";
import { SortableTh } from "@/components/sortable-th";
import ComprobanteRow from "./comprobante-row";
import ComprobantesFiltros from "./comprobantes-filtros";

export default async function ComprobantesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; direccion?: string; estado?: string; tercero?: string }>;
}) {
  const { sort, dir, direccion, estado, tercero } = await searchParams;
  const supabase = await createClient();

  const { data: terceros } = await supabase.from("terceros").select("id, razon_social").order("razon_social");

  let query = supabase.from("comprobantes").select("*, terceros(razon_social)").limit(1000);
  if (direccion) query = query.eq("direccion", direccion);
  if (estado) query = query.eq("estado", estado);
  if (tercero) query = query.eq("tercero_id", tercero);

  const { data } = await query;

  // El ordenamiento por tercero se hace en JS: PostgREST no puede ordenar las filas
  // principales por una columna de una tabla relacionada (el `order` con referencedTable
  // solo ordena el array embebido dentro de cada fila, no las filas mismas).
  const campo = sort ?? "fecha";
  const ascending = sort ? dir === "asc" : false;
  const comprobantes = [...(data ?? [])].sort((a, b) => {
    let cmp = 0;
    if (campo === "numero") cmp = (a.numero ?? 0) - (b.numero ?? 0);
    else if (campo === "total") cmp = Number(a.total) - Number(b.total);
    else if (campo === "tercero") {
      const nombreA = (a.terceros as unknown as { razon_social: string } | null)?.razon_social ?? "";
      const nombreB = (b.terceros as unknown as { razon_social: string } | null)?.razon_social ?? "";
      cmp = nombreA.localeCompare(nombreB);
    } else cmp = a.fecha.localeCompare(b.fecha);
    return ascending ? cmp : -cmp;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle>Comprobantes</PageTitle>
        <div className="flex items-center gap-2">
          <Link href="/comprobantes/importar-arca">
            <Button>Importar de ARCA →</Button>
          </Link>
          <Link href="/comprobantes/escanear">
            <Button>Escanear factura →</Button>
          </Link>
          <Link href="/comprobantes/pendientes">
            <Button>Pendientes de pago →</Button>
          </Link>
          <Link href="/comprobantes/nuevo">
            <Button variant="primary">+ Nuevo Comprobante</Button>
          </Link>
        </div>
      </div>
      <ComprobantesFiltros terceros={terceros ?? []} />
      <Card>
        <Table>
          <thead>
            <tr>
              <SortableTh field="fecha" defaultDir="desc">
                Fecha
              </SortableTh>
              <Th>Mes Imp.</Th>
              <Th>Tipo</Th>
              <SortableTh field="numero">N°</SortableTh>
              <SortableTh field="tercero">Tercero</SortableTh>
              <Th>Dirección</Th>
              <SortableTh field="total" right defaultDir="desc">
                Total
              </SortableTh>
              <Th>Estado</Th>
              <Th right>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {comprobantes.map((c) => (
              <ComprobanteRow
                key={c.id}
                comprobante={c}
                terceroNombre={(c.terceros as { razon_social: string } | null)?.razon_social ?? "-"}
              />
            ))}
            {comprobantes.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                  Sin comprobantes que coincidan
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
