import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import { fechaAMes } from "@/lib/periodos-iva";
import EscanearForm from "./escanear-form";

export default async function EscanearComprobantePage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();

  const [{ data: terceros }, { data: presentados }, { data: existentes }] = await Promise.all([
    supabase.from("terceros").select("id, cuit, razon_social, tipo, cuenta_gasto_id").not("cuit", "is", null),
    supabase
      .from("vencimientos_impositivos")
      .select("periodo_fiscal")
      .eq("estado", "presentado")
      .not("periodo_fiscal", "is", null),
    supabase.from("comprobantes").select("tercero_id, tipo, punto_venta, numero").neq("estado", "anulado"),
  ]);

  const periodosCerrados = Array.from(
    new Set((presentados ?? []).map((p) => fechaAMes(p.periodo_fiscal as string)))
  );
  const comprobantesExistentes = (existentes ?? []).map(
    (c) => `${c.tercero_id}|${c.tipo}|${c.punto_venta}|${c.numero}`
  );

  return (
    <div>
      <div className="mb-6">
        <PageTitle>Escanear Comprobante</PageTitle>
        <p className="mt-1 text-[12px] text-ink-2">
          <Link href="/comprobantes" className="text-accent hover:opacity-80">
            ← Volver a Comprobantes
          </Link>
        </p>
      </div>
      <EscanearForm
        empresaId={empresa!.id}
        terceros={(terceros ?? []).map((t) => ({ ...t, cuit: t.cuit as string }))}
        periodosCerrados={periodosCerrados}
        comprobantesExistentes={comprobantesExistentes}
      />
    </div>
  );
}
