import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import { Card, Table, Th, Button } from "@/components/ui";
import ComprobanteRow from "./comprobante-row";

export default async function ComprobantesPage() {
  const supabase = await createClient();
  const { data: comprobantes } = await supabase
    .from("comprobantes")
    .select("*, terceros(razon_social)")
    .order("fecha", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle>Comprobantes</PageTitle>
        <div className="flex items-center gap-2">
          <Link href="/comprobantes/pendientes">
            <Button>Pendientes de pago →</Button>
          </Link>
          <Link href="/comprobantes/nuevo">
            <Button variant="primary">+ Nuevo Comprobante</Button>
          </Link>
        </div>
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Mes Imp.</Th>
              <Th>Tipo</Th>
              <Th>N°</Th>
              <Th>Tercero</Th>
              <Th>Dirección</Th>
              <Th right>Total</Th>
              <Th>Estado</Th>
              <Th right>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {(comprobantes ?? []).map((c) => (
              <ComprobanteRow
                key={c.id}
                comprobante={c}
                terceroNombre={(c.terceros as { razon_social: string } | null)?.razon_social ?? "-"}
              />
            ))}
            {(comprobantes ?? []).length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                  Sin comprobantes todavía
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
