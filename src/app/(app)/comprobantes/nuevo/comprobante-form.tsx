"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionVenta, DireccionComprobante, TipoComprobante } from "@/lib/types";
import { Card, Field, Input, Select, Button, money } from "@/components/ui";
import { mesAFecha, mesImputacionSugerido } from "@/lib/periodos-iva";

interface Item {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  alicuota_iva: number;
  cuentaId: string;
}

interface Tercero {
  id: string;
  razon_social: string;
  tipo: string;
  cuenta_gasto_id: string | null;
}

interface Cuenta {
  id: string;
  codigo: string;
  nombre: string;
}

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

export default function ComprobanteForm({
  terceros,
  cuentas,
  empresaId,
  periodosCerrados,
}: {
  terceros: Tercero[];
  cuentas: Cuenta[];
  empresaId: string;
  periodosCerrados: string[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const cerrados = new Set(periodosCerrados);

  const [direccion, setDireccion] = useState<DireccionComprobante>("venta");
  const [tipo, setTipo] = useState<TipoComprobante>("factura_b");
  const [puntoVenta, setPuntoVenta] = useState(1);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [mesImputacion, setMesImputacion] = useState(() =>
    mesImputacionSugerido(new Date().toISOString().slice(0, 10), cerrados)
  );
  const [mesImputacionTocado, setMesImputacionTocado] = useState(false);
  const [terceroId, setTerceroId] = useState("");
  const [condicionVenta, setCondicionVenta] = useState<CondicionVenta>("contado");
  const [items, setItems] = useState<Item[]>([
    { descripcion: "", cantidad: 1, precio_unitario: 0, alicuota_iva: 21, cuentaId: "" },
  ]);
  const [percepcionIva, setPercepcionIva] = useState(0);
  const [percepcionIibb, setPercepcionIibb] = useState(0);
  const [confirmarYa, setConfirmarYa] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mesImputacionTocado) return;
    setMesImputacion(mesImputacionSugerido(fecha, cerrados));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  const mesImputacionCerrado = cerrados.has(mesImputacion);

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const iva = items.reduce((s, i) => s + i.cantidad * i.precio_unitario * (i.alicuota_iva / 100), 0);
  const total = subtotal + iva + (direccion === "compra" ? percepcionIva + percepcionIibb : 0);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    const cuentaPorDefecto = terceros.find((t) => t.id === terceroId)?.cuenta_gasto_id ?? "";
    setItems((prev) => [
      ...prev,
      { descripcion: "", cantidad: 1, precio_unitario: 0, alicuota_iva: 21, cuentaId: cuentaPorDefecto },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function cambiarTercero(id: string) {
    setTerceroId(id);
    const cuentaPorDefecto = terceros.find((t) => t.id === id)?.cuenta_gasto_id ?? "";
    if (cuentaPorDefecto) {
      setItems((prev) => prev.map((it) => (it.cuentaId ? it : { ...it, cuentaId: cuentaPorDefecto })));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!terceroId) {
      setError("Elegí un cliente/proveedor");
      return;
    }
    if (items.some((i) => !i.descripcion)) {
      setError("Completá la descripción de todos los ítems");
      return;
    }
    if (mesImputacionCerrado) {
      setError(
        `El IVA de ${mesImputacion} ya está presentado. Elegí otro mes de imputación (por ejemplo, el siguiente).`
      );
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: comprobante, error: compError } = await supabase
      .from("comprobantes")
      .insert({
        empresa_id: empresaId,
        direccion,
        tipo,
        punto_venta: puntoVenta,
        fecha,
        mes_imputacion: mesAFecha(mesImputacion),
        tercero_id: terceroId,
        condicion_venta: condicionVenta,
        percepcion_iva: direccion === "compra" ? percepcionIva : 0,
        percepcion_iibb: direccion === "compra" ? percepcionIibb : 0,
        creado_por: user?.id,
      })
      .select()
      .single();

    if (compError || !comprobante) {
      setError(compError?.message ?? "Error al crear el comprobante");
      setLoading(false);
      return;
    }

    const { error: itemsError } = await supabase.from("comprobante_items").insert(
      items.map((i) => ({
        comprobante_id: comprobante.id,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        alicuota_iva: i.alicuota_iva,
        subtotal: i.cantidad * i.precio_unitario,
        cuenta_id: i.cuentaId || null,
      }))
    );

    if (itemsError) {
      setError(itemsError.message);
      setLoading(false);
      return;
    }

    if (confirmarYa) {
      const { error: confirmError } = await supabase
        .from("comprobantes")
        .update({ estado: "confirmado" })
        .eq("id", comprobante.id);
      if (confirmError) {
        setError(confirmError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/comprobantes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <div className="grid grid-cols-1 gap-4 p-[1.15rem] sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Dirección">
            <Select value={direccion} onChange={(e) => setDireccion(e.target.value as DireccionComprobante)} className="w-full normal-case">
              <option value="venta">Venta</option>
              <option value="compra">Compra</option>
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoComprobante)} className="w-full normal-case">
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Punto de Venta">
            <Input type="number" min={1} value={puntoVenta} onChange={(e) => setPuntoVenta(Number(e.target.value))} className="w-full normal-case" />
          </Field>
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full normal-case" />
          </Field>
          <Field label="Mes de Imputación">
            <Input
              type="month"
              value={mesImputacion}
              onChange={(e) => {
                setMesImputacion(e.target.value);
                setMesImputacionTocado(true);
              }}
              className={`w-full normal-case ${mesImputacionCerrado ? "border-bad text-bad" : ""}`}
            />
            {mesImputacionCerrado && (
              <span className="mt-1 block text-[10px] normal-case text-bad">
                El IVA de este mes ya está presentado
              </span>
            )}
          </Field>
          <Field label="Cliente / Proveedor">
            <Select value={terceroId} onChange={(e) => cambiarTercero(e.target.value)} className="w-full normal-case">
              <option value="">Seleccionar...</option>
              {terceros.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.razon_social}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Condición">
            <Select value={condicionVenta} onChange={(e) => setCondicionVenta(e.target.value as CondicionVenta)} className="w-full normal-case">
              <option value="contado">Contado</option>
              <option value="cuenta_corriente">Cuenta Corriente</option>
            </Select>
          </Field>
          {direccion === "compra" && (
            <>
              <Field label="Percepción IVA">
                <Input type="number" step="0.01" value={percepcionIva} onChange={(e) => setPercepcionIva(Number(e.target.value))} className="w-full normal-case" />
              </Field>
              <Field label="Percepción IIBB">
                <Input type="number" step="0.01" value={percepcionIibb} onChange={(e) => setPercepcionIibb(Number(e.target.value))} className="w-full normal-case" />
              </Field>
            </>
          )}
        </div>
      </Card>

      <Card
        title="Ítems"
        actions={
          <button type="button" onClick={addItem} className="text-[11px] font-medium text-accent hover:opacity-80">
            + Agregar ítem
          </button>
        }
      >
        <div className="space-y-2 p-[1.15rem]">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <Input
                placeholder="Descripción"
                value={item.descripcion}
                onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
                className="col-span-4 normal-case"
              />
              <Select
                value={item.cuentaId}
                onChange={(e) => updateItem(idx, { cuentaId: e.target.value })}
                className="col-span-3 normal-case"
              >
                <option value="">Cuenta (opcional)...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Cant."
                value={item.cantidad}
                onChange={(e) => updateItem(idx, { cantidad: Number(e.target.value) })}
                className="col-span-1 normal-case"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Precio Unit."
                value={item.precio_unitario}
                onChange={(e) => updateItem(idx, { precio_unitario: Number(e.target.value) })}
                className="col-span-2 normal-case"
              />
              <Select
                value={item.alicuota_iva}
                onChange={(e) => updateItem(idx, { alicuota_iva: Number(e.target.value) })}
                className="col-span-1 normal-case"
              >
                <option value={0}>0%</option>
                <option value={10.5}>10.5%</option>
                <option value={21}>21%</option>
                <option value={27}>27%</option>
              </Select>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="col-span-1 text-[13px] text-bad hover:opacity-80"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="px-[1.15rem] pb-2 text-[11px] text-ink-2">
          Si no elegís cuenta, se usa la cuenta de gasto/activo del proveedor (o Costo de Mercadería
          Vendida si tampoco tiene una configurada).
        </p>
        <div className="flex flex-wrap justify-end gap-6 border-t border-line px-[1.15rem] py-3 text-[12.5px]">
          <p className="text-ink-2">
            Subtotal: <span className="font-mono font-medium text-ink">{money(subtotal)}</span>
          </p>
          <p className="text-ink-2">
            IVA: <span className="font-mono font-medium text-ink">{money(iva)}</span>
          </p>
          {direccion === "compra" && (percepcionIva > 0 || percepcionIibb > 0) && (
            <p className="text-ink-2">
              Percepciones:{" "}
              <span className="font-mono font-medium text-ink">{money(percepcionIva + percepcionIibb)}</span>
            </p>
          )}
          <p className="text-ink-2">
            Total: <span className="font-mono text-[15px] font-semibold text-accent">{money(total)}</span>
          </p>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[12.5px] text-ink">
          <input
            type="checkbox"
            checked={confirmarYa}
            onChange={(e) => setConfirmarYa(e.target.checked)}
          />
          Confirmar y generar asiento contable automáticamente
        </label>
        <div className="flex items-center gap-3">
          {error && <p className="text-[12px] text-bad">{error}</p>}
          <Button type="submit" variant="primary" disabled={loading || mesImputacionCerrado}>
            {loading ? "Guardando..." : "Guardar Comprobante"}
          </Button>
        </div>
      </div>
    </form>
  );
}
