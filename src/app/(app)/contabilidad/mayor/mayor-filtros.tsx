"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Field, Input, Select, Button } from "@/components/ui";

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
      <Field label="Cuenta">
        <Select value={cuenta} onChange={(e) => setCuenta(e.target.value)} className="min-w-[220px] normal-case">
          <option value="">Todas las cuentas</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Desde">
        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="normal-case" />
      </Field>
      <Field label="Hasta">
        <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="normal-case" />
      </Field>
      <Button type="submit" variant="primary">
        Filtrar
      </Button>
      {(cuenta || desde || hasta) && (
        <Button type="button" onClick={limpiar}>
          Limpiar
        </Button>
      )}
    </form>
  );
}
