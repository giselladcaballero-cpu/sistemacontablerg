"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Field, Select } from "@/components/ui";

export default function TercerosFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo") ?? "";

  function setTipo(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("tipo", value);
    else params.delete("tipo");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <Field label="Tipo">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value)} className="normal-case">
          <option value="">Todos</option>
          <option value="cliente">Cliente</option>
          <option value="proveedor">Proveedor</option>
          <option value="ambos">Ambos</option>
        </Select>
      </Field>
      {tipo && (
        <button type="button" onClick={() => router.push(pathname)} className="text-[11px] text-ink-2 hover:text-ink">
          Limpiar filtro
        </button>
      )}
    </div>
  );
}
