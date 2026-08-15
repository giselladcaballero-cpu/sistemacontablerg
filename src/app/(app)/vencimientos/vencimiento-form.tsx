"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Select, Button } from "@/components/ui";

const CONCEPTOS = [
  "IVA",
  "Ganancias",
  "Ingresos Brutos",
  "Monotributo",
  "Cargas Sociales",
  "SICORE",
  "Otro",
];

export default function VencimientoForm({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [concepto, setConcepto] = useState("IVA");
  const [conceptoOtro, setConceptoOtro] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fecha) {
      setError("Ingresá la fecha de vencimiento");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase.from("vencimientos_impositivos").insert({
      empresa_id: empresaId,
      concepto: concepto === "Otro" ? conceptoOtro || "Otro" : concepto,
      periodo: periodo || null,
      fecha_vencimiento: fecha,
      notas: notas || null,
      creado_por: user.user?.id,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPeriodo("");
    setFecha("");
    setNotas("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-[10px] border border-line bg-surface p-[1.15rem]">
      <h2 className="text-[12px] font-medium uppercase tracking-[.07em] text-ink-2">Nuevo Vencimiento</h2>
      <Field label="Concepto">
        <Select value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full normal-case">
          {CONCEPTOS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      {concepto === "Otro" && (
        <Field label="Especificar">
          <Input value={conceptoOtro} onChange={(e) => setConceptoOtro(e.target.value)} className="w-full normal-case" />
        </Field>
      )}
      <Field label="Período (ej. 07/2026)">
        <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="w-full normal-case" />
      </Field>
      <Field label="Fecha de Vencimiento">
        <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full normal-case" />
      </Field>
      <Field label="Notas">
        <Input value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full normal-case" />
      </Field>
      {error && <p className="text-[11px] text-bad">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
