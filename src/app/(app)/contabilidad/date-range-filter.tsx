"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Field, Input, Button } from "@/components/ui";

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
      <Field label="Desde">
        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="normal-case" />
      </Field>
      <Field label="Hasta">
        <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="normal-case" />
      </Field>
      <Button type="submit" variant="primary">
        Filtrar
      </Button>
      {(desde || hasta) && (
        <Button type="button" onClick={limpiar}>
          Limpiar
        </Button>
      )}
      <div className="ml-auto">{children}</div>
    </form>
  );
}
