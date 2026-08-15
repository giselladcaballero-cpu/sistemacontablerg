"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Row, Td, Badge, type Tone } from "@/components/ui";

interface Vencimiento {
  id: string;
  concepto: string;
  periodo: string | null;
  fecha_vencimiento: string;
  estado: "pendiente" | "pagado";
  notas: string | null;
}

export default function VencimientoRow({ vencimiento, hoy }: { vencimiento: Vencimiento; hoy: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dias = Math.round(
    (new Date(vencimiento.fecha_vencimiento).getTime() - new Date(hoy).getTime()) / 86400000
  );

  let estadoLabel = "OK";
  let estadoTone: Tone = "accent";
  if (vencimiento.estado === "pagado") {
    estadoLabel = "Pagado";
    estadoTone = "muted";
  } else if (dias < 0) {
    estadoLabel = "Vencido";
    estadoTone = "bad";
  } else if (dias <= 7) {
    estadoLabel = `En ${dias} día${dias === 1 ? "" : "s"}`;
    estadoTone = "gold";
  }

  async function marcarPagado() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("vencimientos_impositivos")
      .update({ estado: "pagado" })
      .eq("id", vencimiento.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el vencimiento de ${vencimiento.concepto}?`)) return;
    setLoading(true);
    const { error } = await supabase.from("vencimientos_impositivos").delete().eq("id", vencimiento.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <Row>
      <Td mono className="text-ink-2">
        {vencimiento.fecha_vencimiento}
      </Td>
      <Td>{vencimiento.concepto}</Td>
      <Td className="text-ink-2">{vencimiento.periodo ?? "-"}</Td>
      <Td className="text-ink-2">{vencimiento.notas ?? "-"}</Td>
      <Td>
        <Badge tone={estadoTone}>{estadoLabel}</Badge>
      </Td>
      <Td right>
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
          {vencimiento.estado === "pendiente" && (
            <button onClick={marcarPagado} disabled={loading} className="text-[11px] font-medium text-accent hover:opacity-80">
              Marcar pagado
            </button>
          )}
          <button onClick={eliminar} disabled={loading} className="text-[11px] text-bad hover:opacity-80">
            Eliminar
          </button>
        </div>
        {error && <p className="text-[11px] text-bad">{error}</p>}
      </Td>
    </Row>
  );
}
