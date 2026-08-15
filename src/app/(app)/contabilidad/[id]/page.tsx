import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import ContabilidadTabs from "../contabilidad-tabs";
import AsientoEditForm from "./asiento-edit-form";

export default async function EditarAsientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: asiento }, { data: lineas }, { data: cuentas }, { data: terceros }] = await Promise.all([
    supabase.from("asientos").select("*").eq("id", id).maybeSingle(),
    supabase.from("asiento_lineas").select("*").eq("asiento_id", id),
    supabase.from("plan_cuentas").select("id, codigo, nombre").eq("imputable", true).eq("activa", true).order("codigo"),
    supabase.from("terceros").select("id, razon_social").order("razon_social"),
  ]);

  if (!asiento) notFound();

  return (
    <div>
      <PageTitle>Contabilidad</PageTitle>
      <ContabilidadTabs />

      {asiento.origen !== "manual" || asiento.anulado ? (
        <p className="text-sm text-ink-soft">
          Este asiento fue generado automáticamente por un comprobante u orden de pago (o está
          anulado) y no se puede editar directamente. Modificá el documento que lo originó.
        </p>
      ) : (
        <>
          <h2 className="mb-4 text-base font-medium text-ink">Editar Asiento #{asiento.numero}</h2>
          <AsientoEditForm
            asiento={asiento}
            lineasIniciales={lineas ?? []}
            cuentas={cuentas ?? []}
            terceros={terceros ?? []}
          />
        </>
      )}
    </div>
  );
}
