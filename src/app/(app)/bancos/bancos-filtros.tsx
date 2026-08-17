"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Field, Select } from "@/components/ui";

export default function BancosFiltros({ cuentas }: { cuentas: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cuenta = searchParams.get("cuenta") ?? "";
  const tipo = searchParams.get("tipo") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <Field label="Cuenta">
        <Select value={cuenta} onChange={(e) => setParam("cuenta", e.target.value)} className="min-w-[180px] normal-case">
          <option value="">Todas</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tipo">
        <Select value={tipo} onChange={(e) => setParam("tipo", e.target.value)} className="normal-case">
          <option value="">Todos</option>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </Select>
      </Field>
      {(cuenta || tipo) && (
        <button type="button" onClick={() => router.push(pathname)} className="text-[11px] text-ink-2 hover:text-ink">
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
