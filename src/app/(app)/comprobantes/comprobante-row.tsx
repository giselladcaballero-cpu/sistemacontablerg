"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Comprobante } from "@/lib/types";
import { Row, Td, Badge, pesos, type Tone } from "@/components/ui";

const ESTADO_TONE: Record<string, Tone> = {
  confirmado: "good",
  cobrado: "good",
  pagado: "good",
  borrador: "gold",
  anulado: "bad",
};

export default function ComprobanteRow({
  comprobante,
  terceroNombre,
}: {
  comprobante: Comprobante;
  terceroNombre: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anular() {
    if (!confirm("¿Anular este comprobante? Se anula también el asiento contable que generó.")) return;
    setLoading(true);
    setError(null);
    const { error: compError } = await supabase
      .from("comprobantes")
      .update({ estado: "anulado" })
      .eq("id", comprobante.id);
    if (compError) {
      setLoading(false);
      setError(compError.message);
      return;
    }
    if (comprobante.asiento_id) {
      const { error: asientoError } = await supabase
        .from("asientos")
        .update({ anulado: true })
        .eq("id", comprobante.asiento_id);
      if (asientoError) {
        setLoading(false);
        setError(asientoError.message);
        return;
      }
    }
    setLoading(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este borrador? No se puede deshacer.")) return;
    setLoading(true);
    setError(null);
    await supabase.from("comprobante_items").delete().eq("comprobante_id", comprobante.id);
    const { error } = await supabase.from("comprobantes").delete().eq("id", comprobante.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  const esBorrador = comprobante.estado === "borrador";
  const esAnulable = ["confirmado", "cobrado", "pagado"].includes(comprobante.estado);

  return (
    <Row>
      <Td mono className="text-ink-2">
        {comprobante.fecha}
      </Td>
      <Td mono className="uppercase text-ink-2">
        {comprobante.tipo.replace("_", " ")}
      </Td>
      <Td mono className="text-ink-2">
        {comprobante.punto_venta.toString().padStart(4, "0")}-
        {(comprobante.numero ?? 0).toString().padStart(8, "0")}
      </Td>
      <Td>{terceroNombre}</Td>
      <Td className="capitalize text-ink-2">{comprobante.direccion}</Td>
      <Td right mono>
        {pesos(Number(comprobante.total))}
      </Td>
      <Td>
        <Badge tone={ESTADO_TONE[comprobante.estado] ?? "muted"}>{comprobante.estado}</Badge>
      </Td>
      <Td right>
        {esBorrador && (
          <button onClick={eliminar} disabled={loading} className="text-[11px] text-bad hover:opacity-80">
            Eliminar
          </button>
        )}
        {esAnulable && (
          <button onClick={anular} disabled={loading} className="text-[11px] text-bad hover:opacity-80">
            Anular
          </button>
        )}
        {error && <p className="text-[11px] text-bad">{error}</p>}
      </Td>
    </Row>
  );
}
