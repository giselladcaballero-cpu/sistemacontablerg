"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Field, Select } from "@/components/ui";

export default function ContabilidadFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const origen = searchParams.get("origen") ?? "";
  const orden = searchParams.get("orden") ?? "reciente";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <Field label="Origen">
        <Select value={origen} onChange={(e) => setParam("origen", e.target.value)} className="normal-case">
          <option value="">Todos</option>
          <option value="automatico">Automático</option>
          <option value="manual">Manual</option>
        </Select>
      </Field>
      <Field label="Orden">
        <Select value={orden} onChange={(e) => setParam("orden", e.target.value)} className="normal-case">
          <option value="reciente">Más reciente primero</option>
          <option value="antiguo">Más antiguo primero</option>
          <option value="numero_desc">N° descendente</option>
          <option value="numero_asc">N° ascendente</option>
        </Select>
      </Field>
      {origen && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("origen");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="text-[11px] text-ink-2 hover:text-ink"
        >
          Limpiar filtro
        </button>
      )}
    </div>
  );
}
