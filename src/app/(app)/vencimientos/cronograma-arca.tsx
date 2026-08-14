"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-ink-soft">
        No hay vencimientos oficiales de ARCA cargados para tu terminación de CUIT en este momento.
        Pedime que actualice el cronograma cuando quieras ver el próximo período.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-ink">Vencimientos oficiales de ARCA</h2>
          <p className="text-xs text-ink-soft">Según la terminación de tu CUIT. No incluye Ingresos Brutos (es provincial, no de ARCA).</p>
        </div>
        <button
          onClick={agregarTodos}
          disabled={loadingId !== null}
          className="whitespace-nowrap rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted disabled:opacity-50"
        >
          Agregar todos a mi agenda
        </button>
      </div>
      <ul className="divide-y divide-line text-sm">
        {cronograma.map((item) => {
          const agregado = yaAgregadosSet.has(`${item.concepto}|${item.fecha}`);
          return (
            <li key={item.id} className="flex items-center justify-between py-1.5">
              <span className="text-ink">
                {item.concepto} <span className="text-ink-soft">— {item.fecha}</span>
              </span>
              {agregado ? (
                <span className="text-xs text-ink-soft">En tu agenda</span>
              ) : (
                <button
                  onClick={() => agregar(item)}
                  disabled={loadingId !== null}
                  className="text-xs font-medium text-accent hover:opacity-80 disabled:opacity-50"
                >
                  Agregar
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
