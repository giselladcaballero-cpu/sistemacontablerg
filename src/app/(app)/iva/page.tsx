import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import { Card, Table, Th, pesos } from "@/components/ui";

function Tabla({
  titulo,
  filas,
}: {
  titulo: string;
  filas: { fecha: string; tipo: string; punto_venta: number; numero: number | null; razon_social: string; cuit: string | null; subtotal: number; iva: number; total: number }[];
}) {
  const totalIva = filas.reduce((s, f) => s + Number(f.iva), 0);
  return (
    <Card title={titulo}>
      <Table>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Tipo</Th>
            <Th>N°</Th>
            <Th>Razón Social</Th>
            <Th>CUIT</Th>
            <Th right>Neto</Th>
            <Th right>IVA</Th>
            <Th right>Total</Th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, idx) => (
            <tr key={idx} className="border-b border-line hover:bg-accent/5">
              <td className="px-3 py-2 font-mono text-[11px] text-ink-2">{f.fecha}</td>
              <td className="px-3 py-2 font-mono text-[11px] uppercase text-ink-2">{f.tipo.replace("_", " ")}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-ink-2">
                {f.punto_venta.toString().padStart(4, "0")}-{(f.numero ?? 0).toString().padStart(8, "0")}
              </td>
              <td className="px-3 py-2 text-[12.5px] text-ink">{f.razon_social}</td>
              <td className="px-3 py-2 text-[12.5px] text-ink-2">{f.cuit ?? "-"}</td>
              <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink-2">{pesos(Number(f.subtotal))}</td>
              <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink-2">{pesos(Number(f.iva))}</td>
              <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{pesos(Number(f.total))}</td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                Sin comprobantes
              </td>
            </tr>
          )}
        </tbody>
        {filas.length > 0 && (
          <tfoot className="bg-surface-2 font-medium">
            <tr>
              <td colSpan={6} className="px-3 py-2 text-right text-[12.5px] text-ink-2">
                Total IVA
              </td>
              <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{pesos(totalIva)}</td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </Table>
    </Card>
  );
}

export default async function LibroIvaPage() {
  const supabase = await createClient();
  const [{ data: ventas }, { data: compras }] = await Promise.all([
    supabase.from("v_libro_iva_ventas").select("*"),
    supabase.from("v_libro_iva_compras").select("*"),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle>Libro IVA</PageTitle>
      <Tabla titulo="IVA Ventas" filas={ventas ?? []} />
      <Tabla titulo="IVA Compras" filas={compras ?? []} />
    </div>
  );
}
