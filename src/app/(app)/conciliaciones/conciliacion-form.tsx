"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Field, Select, Button, Table, Th, Td, Badge, pesos } from "@/components/ui";
import { parseExtractoBancario } from "@/lib/conciliacion-import";
import { conciliarMovimientos, type CandidatoConciliacion } from "@/lib/conciliacion-match";

interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string | null;
}

type Estado =
  | { paso: "elegir"; error: string | null }
  | { paso: "procesando" }
  | { paso: "revision"; candidatos: CandidatoConciliacion[]; nombreArchivo: string }
  | { paso: "guardando"; actual: number; total: number }
  | { paso: "resultado"; conciliados: number; nuevos: number; ignorados: number; errores: string[] };

const ESTADO_BADGE: Record<CandidatoConciliacion["estado"], { label: string; tone: "good" | "gold" | "muted" }> = {
  auto: { label: "Conciliado automáticamente", tone: "good" },
  ambiguo: { label: "Varias coincidencias — elegí una", tone: "gold" },
  nuevo: { label: "No está en el sistema — se crea nuevo", tone: "muted" },
};

export default function ConciliacionForm({ cuentas }: { cuentas: CuentaBancaria[] }) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cuentaId, setCuentaId] = useState("");
  const [estado, setEstado] = useState<Estado>({ paso: "elegir", error: null });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !cuentaId) return;

    setEstado({ paso: "procesando" });
    try {
      const importados = await parseExtractoBancario(file);
      if (importados.length === 0) {
        setEstado({ paso: "elegir", error: "No se encontraron movimientos válidos en el archivo." });
        return;
      }

      const { data: existentesData, error: existentesError } = await supabase
        .from("movimientos_bancarios")
        .select("id, fecha, descripcion, importe, tipo")
        .eq("cuenta_bancaria_id", cuentaId)
        .eq("conciliado", false);
      if (existentesError) throw new Error(existentesError.message);

      const existentes = (existentesData ?? []).map((m) => ({
        id: m.id as string,
        fecha: m.fecha as string,
        descripcion: m.descripcion as string,
        importe: Number(m.importe),
        tipo: m.tipo as "ingreso" | "egreso",
      }));

      const candidatos = conciliarMovimientos(importados, existentes);
      setEstado({ paso: "revision", candidatos, nombreArchivo: file.name });
    } catch (err) {
      setEstado({ paso: "elegir", error: err instanceof Error ? err.message : "No se pudo leer el archivo" });
    }
  }

  function elegirOpcion(clave: string, movimientoId: string | null) {
    setEstado((prev) => {
      if (prev.paso !== "revision") return prev;
      return {
        ...prev,
        candidatos: prev.candidatos.map((c) => (c.clave === clave ? { ...c, movimientoId } : c)),
      };
    });
  }

  async function confirmar(candidatos: CandidatoConciliacion[]) {
    const aProcesar = candidatos.filter((c) => c.estado !== "ambiguo" || c.movimientoId !== null);
    setEstado({ paso: "guardando", actual: 0, total: aProcesar.length });

    let conciliados = 0;
    let nuevos = 0;
    let ignorados = 0;
    const errores: string[] = [];

    for (let i = 0; i < aProcesar.length; i++) {
      const c = aProcesar[i];
      setEstado({ paso: "guardando", actual: i, total: aProcesar.length });

      if (c.movimientoId) {
        const { error } = await supabase
          .from("movimientos_bancarios")
          .update({ conciliado: true })
          .eq("id", c.movimientoId);
        if (error) errores.push(`${c.importado.descripcion}: ${error.message}`);
        else conciliados++;
      } else if (c.estado === "nuevo") {
        const { error } = await supabase.from("movimientos_bancarios").insert({
          cuenta_bancaria_id: cuentaId,
          fecha: c.importado.fecha,
          descripcion: c.importado.descripcion,
          importe: c.importado.importe,
          tipo: c.importado.tipo,
          conciliado: true,
        });
        if (error) errores.push(`${c.importado.descripcion}: ${error.message}`);
        else nuevos++;
      } else {
        ignorados++;
      }
    }

    setEstado({ paso: "resultado", conciliados, nuevos, ignorados, errores });
    router.refresh();
  }

  if (estado.paso === "elegir") {
    return (
      <Card title="Conciliar extracto bancario">
        <div className="space-y-3 p-[1.15rem]">
          <p className="text-[11px] text-ink-2">
            Subí el extracto que bajás del home banking (CSV, Excel u OFX). Cada movimiento se compara
            contra los que ya tenés cargados en el sistema (por ejemplo, los que generan las Órdenes de
            Pago) por importe y fecha cercana: si coincide, se marca como conciliado automáticamente; si
            no aparece en el sistema, se da de alta como movimiento nuevo ya conciliado.
          </p>
          <Field label="Cuenta">
            <Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="w-full max-w-sm normal-case">
              <option value="">Seleccionar cuenta...</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.banco ? ` · ${c.banco}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.ofx" onChange={handleFile} className="hidden" />
          <Button variant="primary" onClick={() => inputRef.current?.click()} disabled={!cuentaId}>
            Elegir archivo...
          </Button>
          {!cuentaId && <p className="text-[11px] text-ink-2">Elegí primero la cuenta bancaria.</p>}
          {estado.error && <p className="text-[11px] text-bad">{estado.error}</p>}
        </div>
      </Card>
    );
  }

  if (estado.paso === "procesando") {
    return (
      <Card title="Conciliar extracto bancario">
        <p className="p-[1.15rem] text-[12.5px] text-ink-2">Leyendo el archivo...</p>
      </Card>
    );
  }

  if (estado.paso === "guardando") {
    return (
      <Card title="Conciliar extracto bancario">
        <p className="p-[1.15rem] text-[12.5px] text-ink-2">
          Aplicando {estado.actual + 1} de {estado.total}...
        </p>
      </Card>
    );
  }

  if (estado.paso === "resultado") {
    return (
      <Card title="Conciliar extracto bancario">
        <div className="space-y-2 p-[1.15rem]">
          <p className="text-[12.5px] text-good">Conciliación aplicada.</p>
          <ul className="text-[12px] text-ink-2">
            <li>{estado.conciliados} movimiento(s) conciliado(s) contra el sistema</li>
            <li>{estado.nuevos} movimiento(s) nuevo(s) dado(s) de alta desde el extracto</li>
            {estado.ignorados > 0 && <li>{estado.ignorados} movimiento(s) ignorado(s)</li>}
          </ul>
          {estado.errores.length > 0 && (
            <div className="rounded-[6px] border border-bad/30 bg-bad/[.08] p-2.5">
              <p className="mb-1 text-[11px] font-medium text-bad">{estado.errores.length} fallaron:</p>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-ink-2">
                {estado.errores.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="primary" onClick={() => setEstado({ paso: "elegir", error: null })}>
            Conciliar otro extracto
          </Button>
        </div>
      </Card>
    );
  }

  const pendientesAmbiguo = estado.candidatos.filter((c) => c.estado === "ambiguo" && !c.movimientoId).length;

  return (
    <Card title={`Revisar conciliación — ${estado.nombreArchivo}`}>
      <div className="space-y-3 p-[1.15rem]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[6px] border border-line-strong bg-surface-2 p-2.5">
            <div className="text-[10px] uppercase text-ink-2">Movimientos leídos</div>
            <div className="font-mono text-[15px] text-ink">{estado.candidatos.length}</div>
          </div>
          <div className="rounded-[6px] border border-line-strong bg-surface-2 p-2.5">
            <div className="text-[10px] uppercase text-ink-2">Conciliados automático</div>
            <div className="font-mono text-[15px] text-good">
              {estado.candidatos.filter((c) => c.estado === "auto").length}
            </div>
          </div>
          <div className="rounded-[6px] border border-line-strong bg-surface-2 p-2.5">
            <div className="text-[10px] uppercase text-ink-2">Nuevos</div>
            <div className="font-mono text-[15px] text-ink-2">
              {estado.candidatos.filter((c) => c.estado === "nuevo").length}
            </div>
          </div>
          <div className="rounded-[6px] border border-line-strong bg-surface-2 p-2.5">
            <div className="text-[10px] uppercase text-ink-2">A revisar</div>
            <div className="font-mono text-[15px] text-gold">{pendientesAmbiguo}</div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[6px] border border-line">
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Descripción</Th>
                <Th right>Importe</Th>
                <Th>Estado</Th>
                <Th>Acción</Th>
              </tr>
            </thead>
            <tbody>
              {estado.candidatos.map((c) => {
                const badge = ESTADO_BADGE[c.estado];
                return (
                  <tr key={c.clave} className="border-b border-line last:border-b-0">
                    <Td mono>{c.importado.fecha}</Td>
                    <Td>{c.importado.descripcion}</Td>
                    <Td right>
                      <span className={c.importado.tipo === "ingreso" ? "text-good" : "text-bad"}>
                        {c.importado.tipo === "ingreso" ? "+" : "-"}
                        {pesos(c.importado.importe)}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </Td>
                    <Td>
                      {c.opciones.length > 0 ? (
                        <Select
                          value={c.movimientoId ?? ""}
                          onChange={(e) => elegirOpcion(c.clave, e.target.value || null)}
                          className="w-full normal-case"
                        >
                          <option value="">Crear como nuevo movimiento</option>
                          {c.opciones.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.fecha} — {o.descripcion} — {pesos(o.importe)}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-[11px] text-ink-2">Se crea nuevo movimiento</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => confirmar(estado.candidatos)}>
            Confirmar conciliación
          </Button>
          <Button onClick={() => setEstado({ paso: "elegir", error: null })}>Cancelar</Button>
        </div>
      </div>
    </Card>
  );
}
