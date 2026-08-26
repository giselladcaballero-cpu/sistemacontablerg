import type { MovimientoImportado } from "@/lib/conciliacion-import";

export interface MovimientoExistente {
  id: string;
  fecha: string;
  descripcion: string;
  importe: number;
  tipo: "ingreso" | "egreso";
}

export type EstadoMatch = "auto" | "ambiguo" | "nuevo";

export interface CandidatoConciliacion {
  clave: string;
  importado: MovimientoImportado;
  estado: EstadoMatch;
  opciones: MovimientoExistente[];
  movimientoId: string | null; // null = crear nuevo movimiento
}

const TOLERANCIA_IMPORTE = 0.01;
const DIAS_BUSQUEDA = 10;

function diffDias(a: string, b: string): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / msPorDia);
}

/**
 * Empareja cada movimiento importado del extracto contra los movimientos_bancarios pendientes
 * de conciliar (misma cuenta), por importe exacto + fecha cercana. Cada movimiento existente se
 * usa como mucho una vez.
 */
export function conciliarMovimientos(
  importados: MovimientoImportado[],
  existentes: MovimientoExistente[]
): CandidatoConciliacion[] {
  const usados = new Set<string>();

  return importados.map((importado, idx) => {
    const candidatos = existentes.filter(
      (m) =>
        !usados.has(m.id) &&
        m.tipo === importado.tipo &&
        Math.abs(m.importe - importado.importe) < TOLERANCIA_IMPORTE &&
        diffDias(m.fecha, importado.fecha) <= DIAS_BUSQUEDA
    );

    const clave = `${idx}-${importado.fecha}-${importado.importe}`;

    if (candidatos.length === 0) {
      return { clave, importado, estado: "nuevo", opciones: [], movimientoId: null };
    }

    candidatos.sort((a, b) => diffDias(a.fecha, importado.fecha) - diffDias(b.fecha, importado.fecha));
    const mejorDiff = diffDias(candidatos[0].fecha, importado.fecha);
    const empatados = candidatos.filter((c) => diffDias(c.fecha, importado.fecha) === mejorDiff);

    if (empatados.length > 1) {
      return { clave, importado, estado: "ambiguo", opciones: candidatos, movimientoId: null };
    }

    usados.add(candidatos[0].id);
    return { clave, importado, estado: "auto", opciones: candidatos, movimientoId: candidatos[0].id };
  });
}
