"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Field, Select } from "@/components/ui";

export default function ComprobantesFiltros({ terceros }: { terceros: { id: string; razon_social: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const direccion = searchParams.get("direccion") ?? "";
  const estado = searchParams.get("estado") ?? "";
  const tercero = searchParams.get("tercero") ?? "";

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <Field label="Dirección">
        <Select value={direccion} onChange={(e) => setParam("direccion", e.target.value)} className="normal-case">
          <option value="">Todas</option>
          <option value="venta">Venta</option>
          <option value="compra">Compra</option>
        </Select>
      </Field>
      <Field label="Estado">
        <Select value={estado} onChange={(e) => setParam("estado", e.target.value)} className="normal-case">
          <option value="">Todos</option>
          <option value="borrador">Borrador</option>
          <option value="confirmado">Confirmado</option>
          <option value="cobrado">Cobrado</option>
          <option value="pagado">Pagado</option>
          <option value="anulado">Anulado</option>
        </Select>
      </Field>
      <Field label="Tercero">
        <Select value={tercero} onChange={(e) => setParam("tercero", e.target.value)} className="min-w-[200px] normal-case">
          <option value="">Todos</option>
          {terceros.map((t) => (
            <option key={t.id} value={t.id}>
              {t.razon_social}
            </option>
          ))}
        </Select>
      </Field>
      {(direccion || estado || tercero) && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-[11px] text-ink-2 hover:text-ink"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
