/**
 * Un período de IVA queda "cerrado" cuando se marca como presentada la DDJJ
 * correspondiente en Vencimientos Impositivos. A partir de ahí, no se pueden
 * imputar comprobantes nuevos a ese mes: hay que usar el mes siguiente.
 */

export function fechaAMes(fechaIso: string): string {
  return fechaIso.slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
}

export function mesSiguiente(mesIso: string): string {
  const [anio, mes] = mesIso.slice(0, 7).split("-").map(Number);
  const d = new Date(anio, mes, 1); // mes es 1-based; Date con mes 0-based + 1 = mes siguiente
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Primer mes de imputación disponible a partir de la fecha del comprobante (salta meses cerrados). */
export function mesImputacionSugerido(fechaIso: string, cerrados: Set<string>): string {
  let mes = fechaAMes(fechaIso);
  while (cerrados.has(mes)) {
    mes = mesSiguiente(mes);
  }
  return mes;
}

export function mesAFecha(mesIso: string): string {
  return `${mesIso}-01`;
}
