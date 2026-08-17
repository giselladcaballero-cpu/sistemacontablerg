// Generadores de archivos .txt para depositar retenciones en los aplicativos
// de AFIP/ARCA (SICORE, para IVA y Ganancias) y de Comisión Arbitral (SIRCAR,
// para Ingresos Brutos - Convenio Multilateral).
//
// El layout de ancho fijo de SICORE (198 caracteres por línea) fue reconstruido
// por ingeniería inversa a partir de un archivo modelo real, comparando múltiples
// líneas con CUIT/fechas/importes distintos hasta que los límites de cada campo
// calzaron exactamente en las 198 posiciones. El formato de SIRCAR es un CSV de
// 11 columnas, también reconstruido contra un archivo modelo real.

function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function padNum(n: number, width: number): string {
  return String(Math.trunc(n)).padStart(width, "0").slice(-width);
}

function formatMonto(value: number, totalWidth: number): string {
  return Math.abs(value).toFixed(2).padStart(totalWidth, "0");
}

function cuitDigits(cuit: string | null): string {
  return (cuit ?? "").replace(/\D/g, "").padStart(11, "0").slice(-11);
}

export interface RetencionSicore {
  cuit: string | null;
  fechaComprobante: string; // ISO YYYY-MM-DD, fecha del comprobante original
  puntoVenta: number;
  numeroComprobante: number;
  base: number;
  importe: number; // importe retenido
  fechaPago: string; // ISO YYYY-MM-DD, fecha de la orden de pago (fecha de la retención)
}

// Layout de 198 caracteres, validado contra 9+ líneas del modelo real:
// [0-2) tipo_registro "01" | [2-12) fecha_emision | [12-20) pto_vta(8) | [20-28) numero_comp(8)
// [28-44) importe_operacion(16) | [44-52) cod_regimen(8) | [52-66) importe_base(14)
// [66-76) fecha_retencion | [76-78) "01" | [78-93) importe_retenido(15) | [93-98) 5 espacios
// [98-99) "0" | [99-109) fecha_retencion (repetida) | [109-111) "80" | [111-122) cuit(11)
// [122-131) 9 espacios | [131-145) num_certificado(14) | [145-175) 30 espacios
// [175-176) "0" | [176-198) 22 espacios
export function generarLineaSicore(r: RetencionSicore, codigoRegimen: string, numeroCertificado: number): string {
  const fechaRet = ddmmyyyy(r.fechaPago);
  return (
    "01" +
    ddmmyyyy(r.fechaComprobante) +
    padNum(r.puntoVenta, 8) +
    padNum(r.numeroComprobante, 8) +
    formatMonto(r.base, 16) +
    codigoRegimen.padStart(8, "0").slice(0, 8) +
    formatMonto(r.base, 14) +
    fechaRet +
    "01" +
    formatMonto(r.importe, 15) +
    " ".repeat(5) +
    "0" +
    fechaRet +
    "80" +
    cuitDigits(r.cuit) +
    " ".repeat(9) +
    padNum(numeroCertificado, 14) +
    " ".repeat(30) +
    "0" +
    " ".repeat(22)
  );
}

// Agrupa por CUIT en el orden recibido y asigna un número de certificado
// correlativo por cada nuevo proveedor (se repite mientras el CUIT no cambie),
// tal como se observa en el archivo modelo.
export function generarTxtSicore(
  filas: RetencionSicore[],
  codigoRegimen: string,
  certificadoInicial: number
): string {
  let certificado = certificadoInicial - 1;
  let cuitAnterior: string | null = null;
  const lineas = filas.map((r) => {
    const cuit = cuitDigits(r.cuit);
    if (cuit !== cuitAnterior) {
      certificado += 1;
      cuitAnterior = cuit;
    }
    return generarLineaSicore(r, codigoRegimen, certificado);
  });
  return lineas.join("\r\n") + "\r\n";
}

export interface RetencionSircar {
  cuit: string | null;
  fecha: string; // ISO YYYY-MM-DD
  base: number;
  alicuota: number;
  importe: number;
}

// CSV de 11 columnas: correlativo,1,1,0,cuit,fecha,base,alicuota,retenido,jurisdiccion,agente
export function generarLineaSircar(
  r: RetencionSircar,
  correlativo: number,
  jurisdiccion: string,
  agente: string
): string {
  return [
    padNum(correlativo, 5),
    "1",
    "1",
    "0",
    cuitDigits(r.cuit),
    ddmmyyyy(r.fecha),
    r.base.toFixed(2),
    r.alicuota.toFixed(2),
    r.importe.toFixed(2),
    jurisdiccion,
    agente,
  ].join(",");
}

export function generarTxtSircar(
  filas: RetencionSircar[],
  correlativoInicial: number,
  jurisdiccion: string,
  agente: string
): string {
  const lineas = filas.map((r, i) => generarLineaSircar(r, correlativoInicial + i, jurisdiccion, agente));
  return lineas.join("\r\n") + "\r\n";
}
