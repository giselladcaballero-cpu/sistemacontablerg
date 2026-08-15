"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";

interface CronogramaItem {
  id: string;
  concepto: string;
  fecha: string;
  cuit_terminaciones: number[];
}

export default function CronogramaArca({
  cronograma,
  yaAgregados,
  empresaId,
}: {
  cronograma: CronogramaItem[];
  yaAgregados: string[];
  empresaId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const yaAgregadosSet = useMemo(() => new Set(yaAgregados), [yaAgregados]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function agregar(item: CronogramaItem) {
    setLoadingId(item.id);
    setError(null);
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("vencimientos_impositivos").insert({
      empresa_id: empresaId,
      concepto: item.concepto,
      fecha_vencimiento: item.fecha,
      notas: "Importado del cronograma oficial de ARCA",
      creado_por: user.user?.id,
    });
    setLoadingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function agregarTodos() {
    setLoadingId("todos");
    setError(null);
    const { data: user } = await supabase.auth.getUser();
    const pendientesDeAgregar = cronograma.filter((i) => !yaAgregadosSet.has(`${i.concepto}|${i.fecha}`));
    const { error } = await supabase.from("vencimientos_impositivos").insert(
      pendientesDeAgregar.map((item) => ({
        empresa_id: empresaId,
        concepto: item.concepto,
        fecha_vencimiento: item.fecha,
        notas: "Importado del cronograma oficial de ARCA",
        creado_por: user.user?.id,
      }))
    );
    setLoadingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (cronograma.length === 0) {
    return (
      <p className="rounded-[6px] bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">
        No hay vencimientos oficiales de ARCA cargados para tu terminación de CUIT en este momento.
        Pedime que actualice el cronograma cuando quieras ver el próximo período.
      </p>
    );
  }

  return (
    <Card
      title="Vencimientos oficiales de ARCA"
      actions={
        <Button onClick={agregarTodos} disabled={loadingId !== null} className="whitespace-nowrap">
          Agregar todos a mi agenda
        </Button>
      }
    >
      <p className="px-[1.15rem] pt-3 text-[11px] text-ink-2">
        Según la terminación de tu CUIT. No incluye Ingresos Brutos (es provincial, no de ARCA).
      </p>
      <ul className="divide-y divide-line text-[12.5px]">
        {cronograma.map((item) => {
          const agregado = yaAgregadosSet.has(`${item.concepto}|${item.fecha}`);
          return (
            <li key={item.id} className="flex items-center justify-between px-[1.15rem] py-2">
              <span className="text-ink">
                {item.concepto} <span className="font-mono text-[11px] text-ink-2">— {item.fecha}</span>
              </span>
              {agregado ? (
                <span className="text-[11px] text-ink-2">En tu agenda</span>
              ) : (
                <button
                  onClick={() => agregar(item)}
                  disabled={loadingId !== null}
                  className="text-[11px] font-medium text-accent hover:opacity-80 disabled:opacity-50"
                >
                  Agregar
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="px-[1.15rem] pb-3 pt-2 text-[11px] text-bad">{error}</p>}
    </Card>
  );
}
