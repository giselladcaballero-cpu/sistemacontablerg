"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Field, Select } from "@/components/ui";

export default function OrdenesPagoFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const estado = searchParams.get("estado") ?? "";

  function setEstado(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("estado", value);
    else params.delete("estado");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <Field label="Estado">
        <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="normal-case">
          <option value="">Todos</option>
          <option value="confirmada">Confirmada</option>
          <option value="anulada">Anulada</option>
        </Select>
      </Field>
      {estado && (
        <button type="button" onClick={() => router.push(pathname)} className="text-[11px] text-ink-2 hover:text-ink">
          Limpiar filtro
        </button>
      )}
    </div>
  );
}
