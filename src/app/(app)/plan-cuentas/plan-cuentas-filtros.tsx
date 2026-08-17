"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Field, Select } from "@/components/ui";

export default function PlanCuentasFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo") ?? "";
  const inactivas = searchParams.get("inactivas") === "1";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      <Field label="Tipo">
        <Select value={tipo} onChange={(e) => setParam("tipo", e.target.value)} className="normal-case">
          <option value="">Todos</option>
          <option value="activo">Activo</option>
          <option value="pasivo">Pasivo</option>
          <option value="patrimonio_neto">Patrimonio Neto</option>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </Select>
      </Field>
      <label className="flex items-center gap-2 pb-2 text-[12px] text-ink-2">
        <input
          type="checkbox"
          checked={inactivas}
          onChange={(e) => setParam("inactivas", e.target.checked ? "1" : "")}
        />
        Mostrar inactivas
      </label>
      {tipo && (
        <button type="button" onClick={() => router.push(pathname)} className="pb-2 text-[11px] text-ink-2 hover:text-ink">
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
