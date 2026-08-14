"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionVenta, DireccionComprobante, TipoComprobante } from "@/lib/types";

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
}: {
  terceros: Tercero[];
  cuentas: Cuenta[];
  empresaId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [direccion, setDireccion] = useState<DireccionComprobante>("venta");
  const [tipo, setTipo] = useState<TipoComprobante>("factura_b");
  const [puntoVenta, setPuntoVenta] = useState(1);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-ink-soft">Dirección</label>
          <select
            value={direccion}
            onChange={(e) => setDireccion(e.target.value as DireccionComprobante)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="venta">Venta</option>
            <option value="compra">Compra</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoComprobante)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Punto de Venta</label>
          <input
            type="number"
            min={1}
            value={puntoVenta}
            onChange={(e) => setPuntoVenta(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Cliente / Proveedor</label>
          <select
            value={terceroId}
            onChange={(e) => cambiarTercero(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar...</option>
            {terceros.map((t) => (
              <option key={t.id} value={t.id}>
                {t.razon_social}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Condición</label>
          <select
            value={condicionVenta}
            onChange={(e) => setCondicionVenta(e.target.value as CondicionVenta)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="contado">Contado</option>
            <option value="cuenta_corriente">Cuenta Corriente</option>
          </select>
        </div>
        {direccion === "compra" && (
          <>
            <div>
              <label className="block text-xs font-medium text-ink-soft">Percepción IVA</label>
              <input
                type="number"
                step="0.01"
                value={percepcionIva}
                onChange={(e) => setPercepcionIva(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft">Percepción IIBB</label>
              <input
                type="number"
                step="0.01"
                value={percepcionIibb}
                onChange={(e) => setPercepcionIibb(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
              />
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Ítems</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-ink-soft hover:text-ink"
          >
            + Agregar ítem
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <input
                placeholder="Descripción"
                value={item.descripcion}
                onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
                className="col-span-4 rounded-md border border-line px-2 py-1.5 text-sm"
              />
              <select
                value={item.cuentaId}
                onChange={(e) => updateItem(idx, { cuentaId: e.target.value })}
                className="col-span-3 rounded-md border border-line px-2 py-1.5 text-xs"
              >
                <option value="">Cuenta (opcional)...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Cant."
                value={item.cantidad}
                onChange={(e) => updateItem(idx, { cantidad: Number(e.target.value) })}
                className="col-span-1 rounded-md border border-line px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Precio Unit."
                value={item.precio_unitario}
                onChange={(e) => updateItem(idx, { precio_unitario: Number(e.target.value) })}
                className="col-span-2 rounded-md border border-line px-2 py-1.5 text-sm"
              />
              <select
                value={item.alicuota_iva}
                onChange={(e) => updateItem(idx, { alicuota_iva: Number(e.target.value) })}
                className="col-span-1 rounded-md border border-line px-2 py-1.5 text-sm"
              >
                <option value={0}>0%</option>
                <option value={10.5}>10.5%</option>
                <option value={21}>21%</option>
                <option value={27}>27%</option>
              </select>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="col-span-1 text-sm text-danger hover:text-danger"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Si no elegís cuenta, se usa la cuenta de gasto/activo del proveedor (o Costo de Mercadería
          Vendida si tampoco tiene una configurada).
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-6 border-t pt-3 text-sm">
          <p>
            Subtotal: <span className="font-medium">{subtotal.toFixed(2)}</span>
          </p>
          <p>
            IVA: <span className="font-medium">{iva.toFixed(2)}</span>
          </p>
          {direccion === "compra" && (percepcionIva > 0 || percepcionIibb > 0) && (
            <p>
              Percepciones:{" "}
              <span className="font-medium">{(percepcionIva + percepcionIibb).toFixed(2)}</span>
            </p>
          )}
          <p>
            Total: <span className="font-semibold">{total.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={confirmarYa}
            onChange={(e) => setConfirmarYa(e.target.checked)}
          />
          Confirmar y generar asiento contable automáticamente
        </label>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar Comprobante"}
          </button>
        </div>
      </div>
    </form>
  );
}
