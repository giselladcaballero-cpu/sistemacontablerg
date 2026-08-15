import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import ExportButtons from "@/components/export-buttons";
import { Card, Table, Th, pesos, money } from "@/components/ui";

interface ComprobantePendiente {
  id: string;
  fecha: string;
  tipo: string;
  punto_venta: number;
  numero: number | null;
  total: number;
}

interface Grupo {
  proveedor: string;
  cuit: string | null;
  comprobantes: ComprobantePendiente[];
  subtotal: number;
}

export default async function ComprobantesPendientesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comprobantes")
    .select("id, fecha, tipo, punto_venta, numero, total, terceros(razon_social, cuit)")
    .eq("direccion", "compra")
    .eq("estado", "confirmado")
    .order("fecha", { ascending: true });

  const gruposPorProveedor = new Map<string, Grupo>();
  for (const c of data ?? []) {
    const tercero = c.terceros as unknown as { razon_social: string; cuit: string | null } | null;
    const nombre = tercero?.razon_social ?? "Sin proveedor";
    const grupo = gruposPorProveedor.get(nombre) ?? {
      proveedor: nombre,
      cuit: tercero?.cuit ?? null,
      comprobantes: [],
      subtotal: 0,
    };
    grupo.comprobantes.push({
      id: c.id,
      fecha: c.fecha,
      tipo: c.tipo,
      punto_venta: c.punto_venta,
      numero: c.numero,
      total: Number(c.total),
    });
    grupo.subtotal += Number(c.total);
    gruposPorProveedor.set(nombre, grupo);
  }
  const grupos = Array.from(gruposPorProveedor.values()).sort((a, b) => a.proveedor.localeCompare(b.proveedor));
  const totalGeneral = grupos.reduce((s, g) => s + g.subtotal, 0);

  const exportRows: (string | number)[][] = [];
  for (const g of grupos) {
    for (const c of g.comprobantes) {
      exportRows.push([
        g.proveedor,
        c.fecha,
        c.tipo.replace("_", " ").toUpperCase(),
        `${c.punto_venta.toString().padStart(4, "0")}-${(c.numero ?? 0).toString().padStart(8, "0")}`,
        money(c.total),
      ]);
    }
    exportRows.push([`Subtotal ${g.proveedor}`, "", "", "", money(g.subtotal)]);
  }
  exportRows.push(["TOTAL GENERAL", "", "", "", money(totalGeneral)]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <PageTitle>Facturas Pendientes de Pago</PageTitle>
          <p className="mt-1 text-[12px] text-ink-2">
            <Link href="/comprobantes" className="text-accent hover:opacity-80">
              ← Volver a Comprobantes
            </Link>
          </p>
        </div>
        <ExportButtons
          filename="facturas-pendientes-de-pago"
          title="Facturas Pendientes de Pago por Proveedor"
          headers={["Proveedor", "Fecha", "Tipo", "N°", "Total"]}
          rows={exportRows}
        />
      </div>

      <div className="mb-5 rounded-[10px] border border-line bg-surface px-[1.15rem] py-3">
        <span className="text-[11px] uppercase tracking-[.05em] text-ink-2">Total pendiente de pago</span>
        <div className="font-mono text-[20px] font-semibold text-bad">{pesos(totalGeneral)}</div>
      </div>

      {grupos.length === 0 ? (
        <Card>
          <p className="p-[1.15rem] text-center text-[12.5px] text-ink-2">
            No hay facturas de compra pendientes de pago.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <Card
              key={g.proveedor}
              title={g.proveedor}
              actions={<span className="font-mono text-[12.5px] text-ink">{pesos(g.subtotal)}</span>}
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Tipo</Th>
                    <Th>N°</Th>
                    <Th right>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {g.comprobantes.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-b-0 hover:bg-accent/5">
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-2">{c.fecha}</td>
                      <td className="px-3 py-2 font-mono text-[11px] uppercase text-ink-2">
                        {c.tipo.replace("_", " ")}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-2">
                        {c.punto_venta.toString().padStart(4, "0")}-{(c.numero ?? 0).toString().padStart(8, "0")}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{pesos(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
