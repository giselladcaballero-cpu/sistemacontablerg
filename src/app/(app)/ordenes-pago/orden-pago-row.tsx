"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Row, Td, Badge, pesos, type Tone } from "@/components/ui";

interface OrdenPago {
  id: string;
  fecha: string;
  proveedor: string;
  cuenta_bancaria: string;
  importe_neto: number;
  estado: "borrador" | "confirmada" | "anulada";
}

const ESTADO_TONE: Record<string, Tone> = {
  confirmada: "good",
  borrador: "gold",
  anulada: "bad",
};

export default function OrdenPagoRow({ orden }: { orden: OrdenPago }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anular() {
    if (
      !confirm(
        "¿Anular esta orden de pago? Se revierten las retenciones practicadas, el asiento contable y el pago de las facturas incluidas (vuelven a quedar pendientes)."
      )
    )
      return;
    setLoading(true);
    setError(null);

    const { data: ordenCompleta, error: fetchError } = await supabase
      .from("ordenes_pago")
      .select("asiento_id")
      .eq("id", orden.id)
      .single();
    if (fetchError) {
      setLoading(false);
      setError(fetchError.message);
      return;
    }

    const { data: items } = await supabase
      .from("orden_pago_items")
      .select("comprobante_id")
      .eq("orden_pago_id", orden.id);

    const { error: ordenError } = await supabase
      .from("ordenes_pago")
      .update({ estado: "anulada" })
      .eq("id", orden.id);
    if (ordenError) {
      setLoading(false);
      setError(ordenError.message);
      return;
    }

    if (ordenCompleta?.asiento_id) {
      await supabase.from("asientos").update({ anulado: true }).eq("id", ordenCompleta.asiento_id);
      await supabase.from("movimientos_bancarios").delete().eq("asiento_id", ordenCompleta.asiento_id);
    }

    const comprobanteIds = (items ?? []).map((i) => i.comprobante_id);
    if (comprobanteIds.length > 0) {
      await supabase
        .from("comprobantes")
        .update({ estado: "confirmado" })
        .in("id", comprobanteIds)
        .eq("estado", "pagado");
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <Row>
      <Td mono className="text-ink-2">
        {orden.fecha}
      </Td>
      <Td>{orden.proveedor}</Td>
      <Td className="text-ink-2">{orden.cuenta_bancaria}</Td>
      <Td right mono>
        {pesos(Number(orden.importe_neto))}
      </Td>
      <Td>
        <Badge tone={ESTADO_TONE[orden.estado] ?? "muted"}>{orden.estado}</Badge>
      </Td>
      <Td right>
        {orden.estado === "confirmada" && (
          <button onClick={anular} disabled={loading} className="text-[11px] text-bad hover:opacity-80">
            Anular
          </button>
        )}
        {error && <p className="text-[11px] text-bad">{error}</p>}
      </Td>
    </Row>
  );
}
