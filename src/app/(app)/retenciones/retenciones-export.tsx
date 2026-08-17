"use client";

import { useMemo, useState } from "react";
import { Card, Field, Input, Button, pesos } from "@/components/ui";
import { exportToTxt } from "@/lib/export";
import { generarTxtSicore, generarTxtSircar, type RetencionSicore, type RetencionSircar } from "@/lib/sicore-sircar";

interface DetalleRow {
  fecha_pago: string;
  proveedor: string;
  cuit: string | null;
  fecha_comprobante: string;
  punto_venta: number;
  comprobante_numero: number;
  tipo: string;
  base: number;
  importe: number;
  alicuota: number | null;
}

export default function RetencionesExport({
  detalle,
  codigoRegimen,
  jurisdiccion,
  agente,
}: {
  detalle: DetalleRow[];
  codigoRegimen: string;
  jurisdiccion: string;
  agente: string;
}) {
  const [certificadoInicial, setCertificadoInicial] = useState(1);
  const [correlativoInicial, setCorrelativoInicial] = useState(1);

  const filasSicore = useMemo(
    () =>
      detalle
        .filter((r) => r.tipo === "iva" || r.tipo === "ganancias")
        .sort((a, b) => (a.cuit ?? "").localeCompare(b.cuit ?? "") || a.fecha_comprobante.localeCompare(b.fecha_comprobante)),
    [detalle]
  );
  const filasSircar = useMemo(
    () => detalle.filter((r) => r.tipo === "iibb").sort((a, b) => (a.cuit ?? "").localeCompare(b.cuit ?? "")),
    [detalle]
  );

  const totalSicore = filasSicore.reduce((s, r) => s + r.importe, 0);
  const totalSircar = filasSircar.reduce((s, r) => s + r.importe, 0);

  function exportarSicore() {
    const filas: RetencionSicore[] = filasSicore.map((r) => ({
      cuit: r.cuit,
      fechaComprobante: r.fecha_comprobante,
      puntoVenta: r.punto_venta,
      numeroComprobante: r.comprobante_numero,
      base: r.base,
      importe: r.importe,
      fechaPago: r.fecha_pago,
    }));
    const contenido = generarTxtSicore(filas, codigoRegimen, certificadoInicial);
    exportToTxt("sicore", contenido);
  }

  function exportarSircar() {
    const filas: RetencionSircar[] = filasSircar.map((r) => ({
      cuit: r.cuit,
      fecha: r.fecha_pago,
      base: r.base,
      alicuota: r.alicuota ?? 0,
      importe: r.importe,
    }));
    const contenido = generarTxtSircar(filas, correlativoInicial, jurisdiccion, agente);
    exportToTxt("sircar", contenido);
  }

  return (
    <Card title="Exportar para depósito (período seleccionado)">
      <div className="grid grid-cols-1 gap-4 p-[1.15rem] sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[12.5px] font-medium text-ink">SICORE (IVA + Ganancias)</p>
          <p className="text-[11px] text-ink-2">
            {filasSicore.length} registro{filasSicore.length === 1 ? "" : "s"} — {pesos(totalSicore)}
          </p>
          <Field label="N° de certificado inicial">
            <Input
              type="number"
              min={1}
              value={certificadoInicial}
              onChange={(e) => setCertificadoInicial(Number(e.target.value) || 1)}
              className="w-32 normal-case"
            />
          </Field>
          <Button type="button" variant="primary" disabled={filasSicore.length === 0} onClick={exportarSicore}>
            Exportar SICORE (.txt)
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-[12.5px] font-medium text-ink">SIRCAR (Ingresos Brutos)</p>
          <p className="text-[11px] text-ink-2">
            {filasSircar.length} registro{filasSircar.length === 1 ? "" : "s"} — {pesos(totalSircar)}
          </p>
          <Field label="N° correlativo inicial">
            <Input
              type="number"
              min={1}
              value={correlativoInicial}
              onChange={(e) => setCorrelativoInicial(Number(e.target.value) || 1)}
              className="w-32 normal-case"
            />
          </Field>
          <Button type="button" variant="primary" disabled={filasSircar.length === 0} onClick={exportarSircar}>
            Exportar SIRCAR (.txt)
          </Button>
        </div>
      </div>
    </Card>
  );
}
