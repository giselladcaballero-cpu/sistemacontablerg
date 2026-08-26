"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Field, Input, Select, Button, Table, Th, Td, money } from "@/components/ui";
import { mesAFecha, mesImputacionSugerido } from "@/lib/periodos-iva";
import type { ComprobanteExtraido, ItemExtraido } from "@/lib/comprobante-extraccion";
import type { DireccionComprobante, TipoComprobante } from "@/lib/types";

const TIPOS: { value: TipoComprobante; label: string }[] = [
  { value: "factura_a", label: "Factura A" },
  { value: "factura_b", label: "Factura B" },
  { value: "factura_c", label: "Factura C" },
  { value: "nota_credito_a", label: "Nota de Crédito A" },
  { value: "nota_credito_b", label: "Nota de Crédito B" },
  { value: "nota_credito_c", label: "Nota de Crédito C" },
  { value: "nota_debito_a", label: "Nota de Débito A" },
  { value: "nota_debito_b", label: "Nota de Débito B" },
  { value: "nota_debito_c", label: "Nota de Débito C" },
  { value: "recibo", label: "Recibo" },
];

interface TerceroExistente {
  id: string;
  cuit: string;
  razon_social: string;
  tipo: string;
  cuenta_gasto_id: string | null;
}

interface Candidato {
  clave: string;
  nombreArchivo: string;
  direccion: DireccionComprobante;
  tipo: TipoComprobante;
  puntoVenta: number;
  numero: number;
  fecha: string;
  mesImputacion: string;
  cuitEmisor: string;
  razonSocialEmisor: string;
  terceroId: string | null;
  items: ItemExtraido[];
  percepcionIva: number;
  percepcionIibb: number;
  errorExtraccion: string | null;
}

type Estado =
  | { paso: "elegir"; error: string | null }
  | { paso: "procesando"; actual: number; total: number }
  | { paso: "revision"; candidatos: Candidato[] }
  | { paso: "guardando"; actual: number; total: number }
  | { paso: "resultado"; proveedoresCreados: number; comprobantesImportados: number; errores: string[] };

export default function EscanearForm({
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
  const [estado, setEstado] = useState<Estado>({ paso: "elegir", error: null });
  const [confirmarAuto, setConfirmarAuto] = useState(true);

  const cerrados = useMemo(() => new Set(periodosCerrados), [periodosCerrados]);
  const existentesSet = useMemo(() => new Set(comprobantesExistentes), [comprobantesExistentes]);
  const terceroPorCuit = useMemo(() => {
    const m = new Map<string, TerceroExistente>();
    for (const t of terceros) m.set(t.cuit.replace(/\D/g, ""), t);
    return m;
  }, [terceros]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setEstado({ paso: "procesando", actual: 0, total: files.length });
    const candidatos: Candidato[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setEstado({ paso: "procesando", actual: i, total: files.length });
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/comprobantes/extraer", { method: "POST", body: formData });
        const body = await res.json();
        if (!res.ok) {
          candidatos.push(candidatoConError(file.name, body.error ?? "No se pudo procesar el archivo"));
          continue;
        }
        candidatos.push(candidatoDesdeExtraccion(file.name, body.extraido, cerrados, terceroPorCuit));
      } catch {
        candidatos.push(candidatoConError(file.name, "Error de red al procesar el archivo"));
      }
    }

    setEstado({ paso: "revision", candidatos });
  }

  function candidatoConError(nombreArchivo: string, motivo: string): Candidato {
    return {
      clave: `${nombreArchivo}-${Math.random()}`,
      nombreArchivo,
      direccion: "compra",
      tipo: "factura_b",
      puntoVenta: 1,
      numero: 0,
      fecha: new Date().toISOString().slice(0, 10),
      mesImputacion: mesImputacionSugerido(new Date().toISOString().slice(0, 10), cerrados),
      cuitEmisor: "",
      razonSocialEmisor: "",
      terceroId: null,
      items: [],
      percepcionIva: 0,
      percepcionIibb: 0,
      errorExtraccion: motivo,
    };
  }

  function candidatoDesdeExtraccion(
    nombreArchivo: string,
    ext: ComprobanteExtraido,
    cerradosSet: Set<string>,
    porCuit: Map<string, TerceroExistente>
  ): Candidato {
    const cuit = (ext.cuitEmisor ?? "").replace(/\D/g, "");
    const tercero = porCuit.get(cuit) ?? null;
    return {
      clave: `${nombreArchivo}-${Math.random()}`,
      nombreArchivo,
      direccion: "compra",
      tipo: ext.tipo,
      puntoVenta: ext.puntoVenta,
      numero: ext.numero,
      fecha: ext.fecha,
      mesImputacion: mesImputacionSugerido(ext.fecha, cerradosSet),
      cuitEmisor: cuit,
      razonSocialEmisor: ext.razonSocialEmisor,
      terceroId: tercero?.id ?? null,
      items: ext.items,
      percepcionIva: ext.percepcionIva,
      percepcionIibb: ext.percepcionIibb,
      errorExtraccion: null,
    };
  }

  function actualizarCandidato(clave: string, patch: Partial<Candidato>) {
    setEstado((prev) => {
      if (prev.paso !== "revision") return prev;
      return {
        paso: "revision",
        candidatos: prev.candidatos.map((c) => (c.clave === clave ? { ...c, ...patch } : c)),
      };
    });
  }

  function actualizarItem(clave: string, idx: number, patch: Partial<ItemExtraido>) {
    setEstado((prev) => {
      if (prev.paso !== "revision") return prev;
      return {
        paso: "revision",
        candidatos: prev.candidatos.map((c) =>
          c.clave === clave ? { ...c, items: c.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) } : c
        ),
      };
    });
  }

  function eliminarCandidato(clave: string) {
    setEstado((prev) => {
      if (prev.paso !== "revision") return prev;
      return { paso: "revision", candidatos: prev.candidatos.filter((c) => c.clave !== clave) };
    });
  }

  function esDuplicado(c: Candidato): boolean {
    if (!c.terceroId) return false;
    return existentesSet.has(`${c.terceroId}|${c.tipo}|${c.puntoVenta}|${c.numero}`);
  }

  async function confirmarImportacion(candidatos: Candidato[]) {
    const validos = candidatos.filter((c) => !c.errorExtraccion && !esDuplicado(c));
    setEstado({ paso: "guardando", actual: 0, total: validos.length });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let proveedoresCreados = 0;
    let comprobantesImportados = 0;
    const errores: string[] = [];

    for (let i = 0; i < validos.length; i++) {
      const c = validos[i];
      setEstado({ paso: "guardando", actual: i, total: validos.length });

      let terceroId = c.terceroId;
      if (!terceroId) {
        if (!c.cuitEmisor || !c.razonSocialEmisor) {
          errores.push(`${c.nombreArchivo}: falta CUIT o razón social del emisor, no se pudo crear el proveedor`);
          continue;
        }
        const { data: nuevoTercero, error: terceroError } = await supabase
          .from("terceros")
          .insert({
            empresa_id: empresaId,
            razon_social: c.razonSocialEmisor,
            cuit: c.cuitEmisor,
            tipo: "proveedor",
            condicion_iva: c.tipo.endsWith("_a") ? "responsable_inscripto" : "monotributo",
          })
          .select("id")
          .single();
        if (terceroError || !nuevoTercero) {
          errores.push(`${c.nombreArchivo}: no se pudo crear el proveedor (${terceroError?.message})`);
          continue;
        }
        terceroId = nuevoTercero.id;
        proveedoresCreados++;
      }

      const { data: comprobante, error: compError } = await supabase
        .from("comprobantes")
        .insert({
          empresa_id: empresaId,
          direccion: c.direccion,
          tipo: c.tipo,
          punto_venta: c.puntoVenta,
          numero: c.numero,
          fecha: c.fecha,
          mes_imputacion: mesAFecha(c.mesImputacion),
          tercero_id: terceroId,
          condicion_venta: "cuenta_corriente",
          percepcion_iva: c.percepcionIva,
          percepcion_iibb: c.percepcionIibb,
          creado_por: user?.id,
        })
        .select("id")
        .single();

      if (compError || !comprobante) {
        errores.push(`${c.nombreArchivo}: ${compError?.message ?? "error al crear el comprobante"}`);
        continue;
      }

      const { error: itemsError } = await supabase.from("comprobante_items").insert(
        c.items.map((it) => ({
          comprobante_id: comprobante.id,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          alicuota_iva: it.alicuota_iva,
          subtotal: it.cantidad * it.precio_unitario,
          cuenta_id: null,
        }))
      );
      if (itemsError) {
        errores.push(`${c.nombreArchivo}: ítems (${itemsError.message})`);
        continue;
      }

      if (confirmarAuto) {
        await supabase.from("comprobantes").update({ estado: "confirmado" }).eq("id", comprobante.id);
      }
      comprobantesImportados++;
    }

    setEstado({ paso: "resultado", proveedoresCreados, comprobantesImportados, errores });
    router.refresh();
  }

  if (estado.paso === "elegir") {
    return (
      <Card title="Escanear factura">
        <div className="space-y-3 p-[1.15rem]">
          <p className="text-[11px] text-ink-2">
            Subí una o varias fotos/PDFs de facturas o comprobantes recibidos. Se lee automáticamente el
            tipo, CUIT del emisor, número, fecha e ítems, y se arma un borrador de comprobante de compra
            para que revises antes de guardar.
          </p>
          <p className="text-[11px] text-gold">
            La lectura automática puede equivocarse — revisá siempre los datos extraídos antes de
            confirmar la importación.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            Elegir imagen(es) o PDF...
          </Button>
          {estado.error && <p className="text-[11px] text-bad">{estado.error}</p>}
        </div>
      </Card>
    );
  }

  if (estado.paso === "procesando") {
    return (
      <Card title="Escanear factura">
        <p className="p-[1.15rem] text-[12.5px] text-ink-2">
          Leyendo comprobante {estado.actual + 1} de {estado.total}...
        </p>
      </Card>
    );
  }

  if (estado.paso === "guardando") {
    return (
      <Card title="Escanear factura">
        <p className="p-[1.15rem] text-[12.5px] text-ink-2">
          Guardando {estado.actual + 1} de {estado.total}...
        </p>
      </Card>
    );
  }

  if (estado.paso === "resultado") {
    return (
      <Card title="Escanear factura">
        <div className="space-y-2 p-[1.15rem]">
          <p className="text-[12.5px] text-good">Importación completa.</p>
          <ul className="text-[12px] text-ink-2">
            <li>{estado.proveedoresCreados} proveedor(es) nuevo(s) dado(s) de alta</li>
            <li>{estado.comprobantesImportados} comprobante(s) importado(s)</li>
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
            Escanear otro comprobante
          </Button>
        </div>
      </Card>
    );
  }

  const validos = estado.candidatos.filter((c) => !c.errorExtraccion && !esDuplicado(c));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between p-[1.15rem]">
          <p className="text-[11.5px] text-ink-2">
            {estado.candidatos.length} archivo(s) procesado(s) — revisá cada uno antes de confirmar.
          </p>
          <label className="flex items-center gap-2 text-[12px] text-ink">
            <input type="checkbox" checked={confirmarAuto} onChange={(e) => setConfirmarAuto(e.target.checked)} />
            Confirmar y generar asiento automáticamente
          </label>
        </div>
      </Card>

      {estado.candidatos.map((c) => {
        const subtotal = c.items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
        const iva = c.items.reduce((s, it) => s + it.cantidad * it.precio_unitario * (it.alicuota_iva / 100), 0);
        const total = subtotal + iva + c.percepcionIva + c.percepcionIibb;
        const duplicado = esDuplicado(c);
        const mesCerrado = cerrados.has(c.mesImputacion);

        return (
          <Card
            key={c.clave}
            title={c.nombreArchivo}
            actions={
              <button
                type="button"
                onClick={() => eliminarCandidato(c.clave)}
                className="text-[11px] font-medium text-bad hover:opacity-80"
              >
                Quitar
              </button>
            }
          >
            <div className="space-y-3 p-[1.15rem]">
              {c.errorExtraccion && <p className="text-[11.5px] text-bad">{c.errorExtraccion}</p>}
              {!c.errorExtraccion && duplicado && (
                <p className="text-[11.5px] text-gold">
                  Este comprobante ya está cargado para este proveedor (mismo tipo, punto de venta y número) — se
                  omite.
                </p>
              )}
              {!c.errorExtraccion && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <Field label="Tipo">
                      <Select
                        value={c.tipo}
                        onChange={(e) => actualizarCandidato(c.clave, { tipo: e.target.value as TipoComprobante })}
                        className="w-full normal-case"
                      >
                        {TIPOS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Punto de Venta">
                      <Input
                        type="number"
                        min={1}
                        value={c.puntoVenta}
                        onChange={(e) => actualizarCandidato(c.clave, { puntoVenta: Number(e.target.value) })}
                        className="w-full normal-case"
                      />
                    </Field>
                    <Field label="N° de Comprobante">
                      <Input
                        type="number"
                        min={1}
                        value={c.numero}
                        onChange={(e) => actualizarCandidato(c.clave, { numero: Number(e.target.value) })}
                        className="w-full normal-case"
                      />
                    </Field>
                    <Field label="Fecha">
                      <Input
                        type="date"
                        value={c.fecha}
                        onChange={(e) =>
                          actualizarCandidato(c.clave, {
                            fecha: e.target.value,
                            mesImputacion: mesImputacionSugerido(e.target.value, cerrados),
                          })
                        }
                        className="w-full normal-case"
                      />
                    </Field>
                    <Field label="Mes de Imputación">
                      <Input
                        type="month"
                        value={c.mesImputacion}
                        onChange={(e) => actualizarCandidato(c.clave, { mesImputacion: e.target.value })}
                        className={`w-full normal-case ${mesCerrado ? "border-bad text-bad" : ""}`}
                      />
                    </Field>
                    <Field label="CUIT Emisor">
                      <Input
                        value={c.cuitEmisor}
                        onChange={(e) => actualizarCandidato(c.clave, { cuitEmisor: e.target.value.replace(/\D/g, "") })}
                        className="w-full normal-case"
                      />
                    </Field>
                  </div>
                  <Field label="Proveedor">
                    <Select
                      value={c.terceroId ?? ""}
                      onChange={(e) => actualizarCandidato(c.clave, { terceroId: e.target.value || null })}
                      className="w-full normal-case"
                    >
                      <option value="">
                        {c.razonSocialEmisor ? `Nuevo: ${c.razonSocialEmisor} (${c.cuitEmisor})` : "Sin identificar — completá el CUIT"}
                      </option>
                      {terceros.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.razon_social}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div className="overflow-x-auto rounded-[6px] border border-line">
                    <Table>
                      <thead>
                        <tr>
                          <Th>Descripción</Th>
                          <Th right>Cant.</Th>
                          <Th right>Precio Unit.</Th>
                          <Th right>IVA %</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.items.map((it, idx) => (
                          <tr key={idx}>
                            <Td>
                              <Input
                                value={it.descripcion}
                                onChange={(e) => actualizarItem(c.clave, idx, { descripcion: e.target.value })}
                                className="w-full normal-case"
                              />
                            </Td>
                            <Td right>
                              <Input
                                type="number"
                                step="0.01"
                                value={it.cantidad}
                                onChange={(e) => actualizarItem(c.clave, idx, { cantidad: Number(e.target.value) })}
                                className="w-20 text-right normal-case"
                              />
                            </Td>
                            <Td right>
                              <Input
                                type="number"
                                step="0.01"
                                value={it.precio_unitario}
                                onChange={(e) =>
                                  actualizarItem(c.clave, idx, { precio_unitario: Number(e.target.value) })
                                }
                                className="w-28 text-right normal-case"
                              />
                            </Td>
                            <Td right>
                              <Select
                                value={it.alicuota_iva}
                                onChange={(e) => actualizarItem(c.clave, idx, { alicuota_iva: Number(e.target.value) })}
                                className="normal-case"
                              >
                                <option value={0}>0%</option>
                                <option value={10.5}>10.5%</option>
                                <option value={21}>21%</option>
                                <option value={27}>27%</option>
                              </Select>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  <div className="flex flex-wrap justify-end gap-6 text-[12.5px]">
                    <p className="text-ink-2">
                      Subtotal: <span className="font-mono font-medium text-ink">{money(subtotal)}</span>
                    </p>
                    <p className="text-ink-2">
                      IVA: <span className="font-mono font-medium text-ink">{money(iva)}</span>
                    </p>
                    <p className="text-ink-2">
                      Total: <span className="font-mono text-[15px] font-semibold text-accent">{money(total)}</span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        );
      })}

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={() => confirmarImportacion(estado.candidatos)}
          disabled={validos.length === 0}
        >
          Importar {validos.length} comprobante(s)
        </Button>
        <Button onClick={() => setEstado({ paso: "elegir", error: null })}>Cancelar</Button>
      </div>
    </div>
  );
}
