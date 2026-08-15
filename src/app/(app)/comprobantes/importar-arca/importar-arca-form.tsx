"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, pesos } from "@/components/ui";
import { parseArcaCsv, type ErrorFilaArca, type FilaArca } from "@/lib/comprobantes-arca-import";
import { mesAFecha, mesImputacionSugerido } from "@/lib/periodos-iva";
import type { CondicionIva } from "@/lib/types";

interface TerceroExistente {
  id: string;
  cuit: string;
  razon_social: string;
}

interface GrupoProveedor {
  cuit: string;
  razonSocial: string;
  terceroId: string | null;
  condicionIvaInferida: CondicionIva;
  aImportar: FilaArca[];
  duplicados: FilaArca[];
}

type Estado =
  | { paso: "elegir" }
  | { paso: "preview"; grupos: GrupoProveedor[]; errores: ErrorFilaArca[]; nombreArchivo: string }
  | { paso: "importando"; actual: number; total: number }
  | {
      paso: "resultado";
      proveedoresCreados: number;
      comprobantesImportados: number;
      duplicadosOmitidos: number;
      erroresImportacion: string[];
    };

function inferirCondicionIva(filas: FilaArca[]): CondicionIva {
  if (filas.some((f) => f.tipo.endsWith("_a"))) return "responsable_inscripto";
  if (filas.some((f) => f.tipo.endsWith("_c"))) return "monotributo";
  return "responsable_inscripto";
}

export default function ImportarArcaForm({
  empresaId,
  terceros,
  periodosCerrados,
  comprobantesExistentes,
}: {
  empresaId: string;
  terceros: TerceroExistente[];
  periodosCerrados: string[];
  comprobantesExistentes: string[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>({ paso: "elegir" });
  const [confirmarAuto, setConfirmarAuto] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cerrados = useMemo(() => new Set(periodosCerrados), [periodosCerrados]);
  const existentesSet = useMemo(() => new Set(comprobantesExistentes), [comprobantesExistentes]);
  const terceroPorCuit = useMemo(() => {
    const m = new Map<string, TerceroExistente>();
    for (const t of terceros) m.set(t.cuit.replace(/\D/g, ""), t);
    return m;
  }, [terceros]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const { filas, errores } = await parseArcaCsv(file);
      if (filas.length === 0) {
        setError("No se encontraron comprobantes válidos en el archivo.");
        return;
      }

      const porCuit = new Map<string, FilaArca[]>();
      for (const f of filas) {
        const arr = porCuit.get(f.cuitEmisor) ?? [];
        arr.push(f);
        porCuit.set(f.cuitEmisor, arr);
      }

      const grupos: GrupoProveedor[] = Array.from(porCuit.entries()).map(([cuit, filasProveedor]) => {
        const terceroExistente = terceroPorCuit.get(cuit) ?? null;
        const aImportar: FilaArca[] = [];
        const duplicados: FilaArca[] = [];
        for (const f of filasProveedor) {
          const key = `${terceroExistente?.id ?? cuit}|${f.tipo}|${f.puntoVenta}|${f.numero}`;
          if (terceroExistente && existentesSet.has(`${terceroExistente.id}|${f.tipo}|${f.puntoVenta}|${f.numero}`)) {
            duplicados.push(f);
          } else if (aImportar.some((y) => `${terceroExistente?.id ?? cuit}|${y.tipo}|${y.puntoVenta}|${y.numero}` === key)) {
            duplicados.push(f);
          } else {
            aImportar.push(f);
          }
        }
        return {
          cuit,
          razonSocial: filasProveedor[0].denominacionEmisor,
          terceroId: terceroExistente?.id ?? null,
          condicionIvaInferida: inferirCondicionIva(filasProveedor),
          aImportar,
          duplicados,
        };
      });
      grupos.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));

      setEstado({ paso: "preview", grupos, errores, nombreArchivo: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo");
    }
  }

  async function confirmarImportacion(grupos: GrupoProveedor[]) {
    const totalFilas = grupos.reduce((s, g) => s + g.aImportar.length, 0);
    setEstado({ paso: "importando", actual: 0, total: totalFilas });
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let proveedoresCreados = 0;
    let comprobantesImportados = 0;
    const erroresImportacion: string[] = [];
    let procesados = 0;

    for (const grupo of grupos) {
      if (grupo.aImportar.length === 0) continue;

      let terceroId = grupo.terceroId;
      if (!terceroId) {
        const { data: nuevoTercero, error: terceroError } = await supabase
          .from("terceros")
          .insert({
            empresa_id: empresaId,
            razon_social: grupo.razonSocial,
            cuit: grupo.cuit,
            tipo: "proveedor",
            condicion_iva: grupo.condicionIvaInferida,
          })
          .select("id")
          .single();
        if (terceroError || !nuevoTercero) {
          erroresImportacion.push(`${grupo.razonSocial}: no se pudo crear el proveedor (${terceroError?.message})`);
          procesados += grupo.aImportar.length;
          setEstado({ paso: "importando", actual: procesados, total: totalFilas });
          continue;
        }
        terceroId = nuevoTercero.id;
        proveedoresCreados++;
      }

      for (const fila of grupo.aImportar) {
        procesados++;
        const mesImputacion = mesImputacionSugerido(fila.fecha, cerrados);

        const { data: comprobante, error: compError } = await supabase
          .from("comprobantes")
          .insert({
            empresa_id: empresaId,
            direccion: "compra",
            tipo: fila.tipo,
            punto_venta: fila.puntoVenta,
            numero: fila.numero,
            fecha: fila.fecha,
            mes_imputacion: mesAFecha(mesImputacion),
            tercero_id: terceroId,
            condicion_venta: "cuenta_corriente",
            percepcion_iva: 0,
            percepcion_iibb: 0,
            creado_por: user?.id,
          })
          .select("id")
          .single();

        if (compError || !comprobante) {
          erroresImportacion.push(
            `${grupo.razonSocial} — ${fila.tipoCodigo} ${fila.puntoVenta}-${fila.numero}: ${compError?.message ?? "error desconocido"}`
          );
          setEstado({ paso: "importando", actual: procesados, total: totalFilas });
          continue;
        }

        const { error: itemsError } = await supabase.from("comprobante_items").insert(
          fila.items.map((it) => ({
            comprobante_id: comprobante.id,
            descripcion: it.descripcion,
            cantidad: 1,
            precio_unitario: it.subtotal,
            alicuota_iva: it.alicuota_iva,
            subtotal: it.subtotal,
            cuenta_id: null,
          }))
        );
        if (itemsError) {
          erroresImportacion.push(
            `${grupo.razonSocial} — ${fila.tipoCodigo} ${fila.puntoVenta}-${fila.numero}: ítems (${itemsError.message})`
          );
          setEstado({ paso: "importando", actual: procesados, total: totalFilas });
          continue;
        }

        if (confirmarAuto) {
          await supabase.from("comprobantes").update({ estado: "confirmado" }).eq("id", comprobante.id);
        }

        comprobantesImportados++;
        setEstado({ paso: "importando", actual: procesados, total: totalFilas });
      }
    }

    const duplicadosOmitidos = grupos.reduce((s, g) => s + g.duplicados.length, 0);
    setEstado({ paso: "resultado", proveedoresCreados, comprobantesImportados, duplicadosOmitidos, erroresImportacion });
    router.refresh();
  }

  if (estado.paso === "elegir") {
    return (
      <Card title="Importar desde ARCA">
        <div className="space-y-3 p-[1.15rem]">
          <p className="text-[11px] text-ink-2">
            Subí el CSV que bajás de ARCA en <strong>Mis Comprobantes → Recibidos → Exportar</strong>. Se
            crean como comprobantes de compra (y los proveedores que todavía no tenés cargados, se dan de
            alta automáticamente por CUIT). Si el mes de un comprobante ya tiene el IVA presentado, se
            imputa al mes siguiente, igual que en la carga manual. Los comprobantes que ya están cargados
            (mismo proveedor + tipo + punto de venta + número) se omiten para no duplicar.
          </p>
          <p className="text-[11px] text-gold">
            No se soportan comprobantes en moneda extranjera ni algunos tipos poco frecuentes — esos quedan
            listados aparte para cargarlos a mano.
          </p>
          <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            Elegir archivo...
          </Button>
          {error && <p className="text-[11px] text-bad">{error}</p>}
        </div>
      </Card>
    );
  }

  if (estado.paso === "preview") {
    const totalAImportar = estado.grupos.reduce((s, g) => s + g.aImportar.length, 0);
    const totalDuplicados = estado.grupos.reduce((s, g) => s + g.duplicados.length, 0);
    const totalMonto = estado.grupos.reduce(
      (s, g) => s + g.aImportar.reduce((s2, f) => s2 + f.total, 0),
      0
    );
    const nuevosProveedores = estado.grupos.filter((g) => !g.terceroId && g.aImportar.length > 0);

    return (
      <Card title={`Importar desde ARCA — ${estado.nombreArchivo}`}>
        <div className="space-y-3 p-[1.15rem]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-[6px] border border-line-strong bg-surface-2 p-2.5">
              <div className="text-[10px] uppercase text-ink-2">A importar</div>
              <div className="font-mono text-[15px] text-accent">{totalAImportar}</div>
            </div>
            <div className="rounded-[6px] border border-line-strong bg-surface-2 p-2.5">
              <div className="text-[10px] uppercase text-ink-2">Proveedores nuevos</div>
              <div className="font-mono text-[15px] text-plum">{nuevosProveedores.length}</div>
            </div>
            <div className="rounded-[6px] border border-line-strong bg-surface-2 p-2.5">
              <div className="text-[10px] uppercase text-ink-2">Ya cargados (se omiten)</div>
              <div className="font-mono text-[15px] text-ink-2">{totalDuplicados}</div>
            </div>
            <div className="rounded-[6px] border border-line-strong bg-surface-2 p-2.5">
              <div className="text-[10px] uppercase text-ink-2">Total a importar</div>
              <div className="font-mono text-[15px] text-ink">{pesos(totalMonto)}</div>
            </div>
          </div>

          {estado.errores.length > 0 && (
            <div className="rounded-[6px] border border-bad/30 bg-bad/[.08] p-2.5">
              <p className="mb-1 text-[11px] font-medium text-bad">
                {estado.errores.length} fila(s) no se pueden importar automáticamente:
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-ink-2">
                {estado.errores.map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-[6px] border border-line">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th className="px-2 py-1.5 text-left font-medium text-ink-3">Proveedor</th>
                  <th className="px-2 py-1.5 text-left font-medium text-ink-3">CUIT</th>
                  <th className="px-2 py-1.5 text-left font-medium text-ink-3">Estado</th>
                  <th className="px-2 py-1.5 text-right font-medium text-ink-3">A importar</th>
                  <th className="px-2 py-1.5 text-right font-medium text-ink-3">Omitidos</th>
                </tr>
              </thead>
              <tbody>
                {estado.grupos.map((g) => (
                  <tr key={g.cuit} className="border-b border-line last:border-b-0">
                    <td className="px-2 py-1 text-ink">{g.razonSocial}</td>
                    <td className="px-2 py-1 font-mono text-ink-2">{g.cuit}</td>
                    <td className="px-2 py-1 text-ink-2">{g.terceroId ? "Existente" : "Nuevo proveedor"}</td>
                    <td className="px-2 py-1 text-right font-mono text-ink">{g.aImportar.length}</td>
                    <td className="px-2 py-1 text-right font-mono text-ink-2">{g.duplicados.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="flex items-center gap-2 text-[12px] text-ink-2">
            <input type="checkbox" checked={confirmarAuto} onChange={(e) => setConfirmarAuto(e.target.checked)} />
            Confirmar automáticamente cada comprobante importado (genera el asiento contable)
          </label>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => confirmarImportacion(estado.grupos)}
              disabled={totalAImportar === 0}
            >
              Importar {totalAImportar} comprobante(s)
            </Button>
            <Button onClick={() => setEstado({ paso: "elegir" })}>Cancelar</Button>
          </div>
        </div>
      </Card>
    );
  }

  if (estado.paso === "importando") {
    return (
      <Card title="Importar desde ARCA">
        <p className="p-[1.15rem] text-[12.5px] text-ink-2">
          Importando {estado.actual} de {estado.total}...
        </p>
      </Card>
    );
  }

  return (
    <Card title="Importar desde ARCA">
      <div className="space-y-2 p-[1.15rem]">
        <p className="text-[12.5px] text-good">Importación completa.</p>
        <ul className="text-[12px] text-ink-2">
          <li>{estado.proveedoresCreados} proveedor(es) nuevo(s) dado(s) de alta</li>
          <li>{estado.comprobantesImportados} comprobante(s) importado(s)</li>
          <li>{estado.duplicadosOmitidos} comprobante(s) omitido(s) por estar ya cargados</li>
        </ul>
        {estado.erroresImportacion.length > 0 && (
          <div className="rounded-[6px] border border-bad/30 bg-bad/[.08] p-2.5">
            <p className="mb-1 text-[11px] font-medium text-bad">
              {estado.erroresImportacion.length} comprobante(s) fallaron:
            </p>
            <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-ink-2">
              {estado.erroresImportacion.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <Button variant="primary" onClick={() => setEstado({ paso: "elegir" })}>
          Importar otro archivo
        </Button>
      </div>
    </Card>
  );
}
