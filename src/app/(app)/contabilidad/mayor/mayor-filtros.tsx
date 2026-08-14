"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function MayorFiltros({ cuentas }: { cuentas: { id: string; codigo: string; nombre: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [cuenta, setCuenta] = useState(searchParams.get("cuenta") ?? "");
  const [desde, setDesde] = useState(searchParams.get("desde") ?? "");
  const [hasta, setHasta] = useState(searchParams.get("hasta") ?? "");

  function aplicar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (cuenta) params.set("cuenta", cuenta);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    router.push(`${pathname}?${params.toString()}`);
  }

  function limpiar() {
    setCuenta("");
    setDesde("");
    setHasta("");
    router.push(pathname);
  }

  return (
    <form onSubmit={aplicar} className="mb-4 flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs font-medium text-ink-soft">Cuenta</label>
        <select
          value={cuenta}
          onChange={(e) => setCuenta(e.target.value)}
          className="mt-1 min-w-[220px] rounded-md border border-line px-2 py-1.5 text-sm"
        >
          <option value="">Todas las cuentas</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Desde</label>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="mt-1 rounded-md border border-line px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Hasta</label>
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="mt-1 rounded-md border border-line px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent/90"
      >
        Filtrar
      </button>
      {(cuenta || desde || hasta) && (
        <button
          type="button"
          onClick={limpiar}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-muted"
        >
          Limpiar
        </button>
      )}
    </form>
  );
}
