/**
 * Vencimientos que se repiten todos los meses (SUSS, SICORE, SIRCAR, IIBB/ATM).
 * En vez de guardar una fila por mes en la base (que hay que actualizar a mano),
 * se calcula la próxima fecha en base a la de hoy: si ya pasó este mes/período,
 * se muestra la del siguiente. Así se van "actualizando solas".
 *
 * SIRCAR usa el calendario oficial 2026 de la Comisión Arbitral (Anexo RG CA
 * N° 21/2025, con la corrección de la Disposición de Presidencia N° 1/2026
 * para Ene/Feb/May/Jul/Oct). SUSS y SICORE (AFIP/ARCA) son una aproximación
 * estándar por día del mes (no una fuente oficial hardcodeable) y se marcan
 * como estimadas en la UI.
 */

export interface VencimientoRecurrente {
  id: string;
  concepto: string;
  fecha: string; // YYYY-MM-DD
  periodo: string; // MM/YYYY
  requiere_agente: boolean;
  requiere_agente_iibb: boolean;
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

/**
 * Calendario oficial SIRCAR 2026 (Anexo RG CA N° 21/2025 + Disposición de
 * Presidencia N° 1/2026). Cada mes: [1ª quincena, 2ª quincena y mensual],
 * cada una como [grupo CUIT 0-4, grupo CUIT 5-9], en formato YYYY-MM-DD.
 */
const SIRCAR_2026: { q1: [string, string]; q2m: [string, string] }[] = [
  { q1: ["2026-01-22", "2026-01-23"], q2m: ["2026-02-06", "2026-02-09"] }, // enero (corregido)
  { q1: ["2026-02-24", "2026-02-25"], q2m: ["2026-03-06", "2026-03-09"] }, // febrero (corregido)
  { q1: ["2026-03-19", "2026-03-20"], q2m: ["2026-04-09", "2026-04-10"] },
  { q1: ["2026-04-23", "2026-04-24"], q2m: ["2026-05-08", "2026-05-11"] },
  { q1: ["2026-05-21", "2026-05-22"], q2m: ["2026-06-05", "2026-06-08"] }, // mayo (corregido)
  { q1: ["2026-06-25", "2026-06-26"], q2m: ["2026-07-07", "2026-07-08"] },
  { q1: ["2026-07-23", "2026-07-24"], q2m: ["2026-08-07", "2026-08-10"] }, // julio (corregido)
  { q1: ["2026-08-27", "2026-08-28"], q2m: ["2026-09-07", "2026-09-08"] },
  { q1: ["2026-09-24", "2026-09-25"], q2m: ["2026-10-08", "2026-10-09"] },
  { q1: ["2026-10-22", "2026-10-23"], q2m: ["2026-11-09", "2026-11-10"] }, // octubre (corregido)
  { q1: ["2026-11-19", "2026-11-24"], q2m: ["2026-12-09", "2026-12-10"] },
  { q1: ["2026-12-22", "2026-12-23"], q2m: ["2027-01-08", "2027-01-11"] },
];

/** Busca, a partir de hoy, la próxima fecha >= hoy en la columna indicada del calendario SIRCAR. */
function proximaFechaSircar(hoy: Date, grupo: 0 | 1, columna: "q1" | "q2m"): string | null {
  const hoyIso = fmtFecha(hoy);
  for (const fila of SIRCAR_2026) {
    const fecha = fila[columna][grupo];
    if (fecha >= hoyIso) return fecha;
  }
  return null;
}

export function generarVencimientosRecurrentes(hoy: Date, terminacion: number): VencimientoRecurrente[] {
  const items: VencimientoRecurrente[] = [];

  // Empleadores (SUSS / F.931): vence días 10, 11 o 12 según terminación (estimado)
  const diaSuss = [10, 11, 12][grupo3(terminacion)];
  const fSuss = proximaFecha(hoy, diaSuss);
  items.push({
    id: `suss-${fmtFecha(fSuss)}`,
    concepto: "Empleadores (SUSS)",
    fecha: fmtFecha(fSuss),
    periodo: periodoDe(fSuss),
    requiere_agente: false,
    requiere_agente_iibb: false,
    requiere_empleador: true,
    periodicidad: null,
    jurisdiccion: null,
  });

  // SICORE (AFIP/ARCA) quincenal: 1ª quincena vence 21/24/25 del mismo mes; 2ª quincena vence 9/10/11 del mes siguiente (estimado)
  const dia1raQuincena = [21, 24, 25][grupo3(terminacion)];
  const f1ra = proximaFecha(hoy, dia1raQuincena);
  items.push({
    id: `sicore-1q-${fmtFecha(f1ra)}`,
    concepto: "SICORE - Retenciones/Percepciones (1ª quincena)",
    fecha: fmtFecha(f1ra),
    periodo: periodoDe(f1ra),
    requiere_agente: true,
    requiere_agente_iibb: false,
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
    requiere_agente_iibb: false,
    requiere_empleador: false,
    periodicidad: "quincenal",
    jurisdiccion: null,
  });

  const fMensualSicore = proximaFecha(hoy, dia2daQuincena);
  items.push({
    id: `sicore-m-${fmtFecha(fMensualSicore)}`,
    concepto: "SICORE - Retenciones/Percepciones (mensual)",
    fecha: fmtFecha(fMensualSicore),
    periodo: periodoDe(fMensualSicore),
    requiere_agente: true,
    requiere_agente_iibb: false,
    requiere_empleador: false,
    periodicidad: "mensual",
    jurisdiccion: null,
  });

  // SIRCAR (Convenio Multilateral / Comisión Arbitral) - depósito de retenciones/percepciones IIBB.
  // Fuente oficial: Anexo RG CA N° 21/2025 + Disposición de Presidencia N° 1/2026. Grupo por CUIT: 0-4 / 5-9.
  const grupoSircar: 0 | 1 = terminacion <= 4 ? 0 : 1;
  const fSircarQ1 = proximaFechaSircar(hoy, grupoSircar, "q1");
  if (fSircarQ1) {
    items.push({
      id: `sircar-1q-${fSircarQ1}`,
      concepto: "SIRCAR - Retenciones/Percepciones IIBB (1ª quincena)",
      fecha: fSircarQ1,
      periodo: periodoDe(new Date(fSircarQ1)),
      requiere_agente: false,
      requiere_agente_iibb: true,
      requiere_empleador: false,
      periodicidad: "quincenal",
      jurisdiccion: null,
    });
  }
  const fSircarQ2 = proximaFechaSircar(hoy, grupoSircar, "q2m");
  if (fSircarQ2) {
    items.push({
      id: `sircar-2q-${fSircarQ2}`,
      concepto: "SIRCAR - Retenciones/Percepciones IIBB (2ª quincena)",
      fecha: fSircarQ2,
      periodo: periodoDe(new Date(fSircarQ2)),
      requiere_agente: false,
      requiere_agente_iibb: true,
      requiere_empleador: false,
      periodicidad: "quincenal",
      jurisdiccion: null,
    });
    items.push({
      id: `sircar-m-${fSircarQ2}`,
      concepto: "SIRCAR - Retenciones/Percepciones IIBB (mensual)",
      fecha: fSircarQ2,
      periodo: periodoDe(new Date(fSircarQ2)),
      requiere_agente: false,
      requiere_agente_iibb: true,
      requiere_empleador: false,
      periodicidad: "mensual",
      jurisdiccion: null,
    });
  }

  // Ingresos Brutos ATM (Mendoza) - DDJJ mensual: vence 15 a 19 según terminación (estimado por padrón, no es SIRCAR)
  const diaAtm = [15, 16, 17, 18, 19][grupo5(terminacion)];
  const fAtm = proximaFecha(hoy, diaAtm);
  items.push({
    id: `atm-iibb-${fmtFecha(fAtm)}`,
    concepto: "Ingresos Brutos ATM (Mendoza) - DDJJ mensual",
    fecha: fmtFecha(fAtm),
    periodo: periodoDe(fAtm),
    requiere_agente: false,
    requiere_agente_iibb: false,
    requiere_empleador: false,
    periodicidad: null,
    jurisdiccion: "Mendoza",
  });

  return items;
}
