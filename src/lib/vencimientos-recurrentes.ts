/**
 * Vencimientos que se repiten todos los meses (SUSS, SICORE, IIBB/ATM, SIRCAR).
 * En vez de guardar una fila por mes en la base (que hay que actualizar a mano),
 * se calcula la próxima fecha en base al día del mes de hoy: si el día ya pasó
 * este mes, se muestra la del mes siguiente. Así se van "actualizando solas".
 *
 * Los días por terminación de CUIT son una aproximación estándar (no oficial,
 * puede variar por fin de semana/feriado); se marcan como estimados en la UI.
 */

export interface VencimientoRecurrente {
  id: string;
  concepto: string;
  fecha: string; // YYYY-MM-DD
  periodo: string; // MM/YYYY
  requiere_agente: boolean;
  requiere_empleador: boolean;
  periodicidad: "mensual" | "quincenal" | null;
  jurisdiccion: string | null;
}

function grupo3(terminacion: number): 0 | 1 | 2 {
  if (terminacion <= 3) return 0;
  if (terminacion <= 6) return 1;
  return 2;
}

function grupo5(terminacion: number): 0 | 1 | 2 | 3 | 4 {
  return Math.min(4, Math.floor(terminacion / 2)) as 0 | 1 | 2 | 3 | 4;
}

/** Próxima fecha con el día indicado: si ya pasó este mes, salta al mes siguiente. */
function proximaFecha(hoy: Date, dia: number): Date {
  const candidata = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
  if (candidata < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
    return new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia);
  }
  return candidata;
}

function fmtFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function periodoDe(d: Date): string {
  // Período de referencia = mes anterior al vencimiento (lo que se está depositando/declarando)
  const anterior = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${String(anterior.getMonth() + 1).padStart(2, "0")}/${anterior.getFullYear()}`;
}

export function generarVencimientosRecurrentes(hoy: Date, terminacion: number): VencimientoRecurrente[] {
  const items: VencimientoRecurrente[] = [];

  // Empleadores (SUSS / F.931): vence días 10, 11 o 12 según terminación
  const diaSuss = [10, 11, 12][grupo3(terminacion)];
  const fSuss = proximaFecha(hoy, diaSuss);
  items.push({
    id: `suss-${fmtFecha(fSuss)}`,
    concepto: "Empleadores (SUSS)",
    fecha: fmtFecha(fSuss),
    periodo: periodoDe(fSuss),
    requiere_agente: false,
    requiere_empleador: true,
    periodicidad: null,
    jurisdiccion: null,
  });

  // SICORE quincenal: 1ª quincena vence 21/24/25 del mismo mes; 2ª quincena vence 9/10/11 del mes siguiente
  const dia1raQuincena = [21, 24, 25][grupo3(terminacion)];
  const f1ra = proximaFecha(hoy, dia1raQuincena);
  items.push({
    id: `sicore-1q-${fmtFecha(f1ra)}`,
    concepto: "SICORE - Retenciones/Percepciones (1ª quincena)",
    fecha: fmtFecha(f1ra),
    periodo: periodoDe(f1ra),
    requiere_agente: true,
    requiere_empleador: false,
    periodicidad: "quincenal",
    jurisdiccion: null,
  });

  const dia2daQuincena = [9, 10, 11][grupo3(terminacion)];
  const f2da = proximaFecha(hoy, dia2daQuincena);
  items.push({
    id: `sicore-2q-${fmtFecha(f2da)}`,
    concepto: "SICORE - Retenciones/Percepciones (2ª quincena)",
    fecha: fmtFecha(f2da),
    periodo: periodoDe(f2da),
    requiere_agente: true,
    requiere_empleador: false,
    periodicidad: "quincenal",
    jurisdiccion: null,
  });

  // SICORE mensual: un solo depósito por mes, mismos días que la 2ª quincena
  const fMensual = proximaFecha(hoy, dia2daQuincena);
  items.push({
    id: `sicore-m-${fmtFecha(fMensual)}`,
    concepto: "SICORE - Retenciones/Percepciones (mensual)",
    fecha: fmtFecha(fMensual),
    periodo: periodoDe(fMensual),
    requiere_agente: true,
    requiere_empleador: false,
    periodicidad: "mensual",
    jurisdiccion: null,
  });

  // Ingresos Brutos ATM (Mendoza) - DDJJ mensual: vence 15 a 19 según terminación
  const diaAtm = [15, 16, 17, 18, 19][grupo5(terminacion)];
  const fAtm = proximaFecha(hoy, diaAtm);
  items.push({
    id: `atm-iibb-${fmtFecha(fAtm)}`,
    concepto: "Ingresos Brutos ATM (Mendoza) - DDJJ mensual",
    fecha: fmtFecha(fAtm),
    periodo: periodoDe(fAtm),
    requiere_agente: false,
    requiere_empleador: false,
    periodicidad: null,
    jurisdiccion: "Mendoza",
  });

  // SIRCAR (Mendoza) - depósito de retenciones/percepciones IIBB: mismos días que la DDJJ
  const fSircar = proximaFecha(hoy, diaAtm);
  items.push({
    id: `sircar-${fmtFecha(fSircar)}`,
    concepto: "SIRCAR - Retenciones/Percepciones IIBB (Mendoza)",
    fecha: fmtFecha(fSircar),
    periodo: periodoDe(fSircar),
    requiere_agente: true,
    requiere_empleador: false,
    periodicidad: null,
    jurisdiccion: "Mendoza",
  });

  return items;
}
