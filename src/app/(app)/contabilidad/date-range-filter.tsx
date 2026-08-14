"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function DateRangeFilter({
  children,
}: {
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [desde, setDesde] = useState(searchParams.get("desde") ?? "");
  const [hasta, setHasta] = useState(searchParams.get("hasta") ?? "");

  function aplicar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (desde) params.set("desde", desde);
    else params.delete("desde");
    if (hasta) params.set("hasta", hasta);
    else params.delete("hasta");
    router.push(`${pathname}?${params.toString()}`);
  }

  function limpiar() {
    setDesde("");
    setHasta("");
    router.push(pathname);
  }

  return (
    <form onSubmit={aplicar} className="mb-4 flex flex-wrap items-end gap-2">
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
      {(desde || hasta) && (
        <button
          type="button"
          onClick={limpiar}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-muted"
        >
          Limpiar
        </button>
      )}
      <div className="ml-auto">{children}</div>
    </form>
  );
}
