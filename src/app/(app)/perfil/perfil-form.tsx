"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionIva } from "@/lib/types";

const JURISDICCIONES = [
  "CABA",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

interface Empresa {
  id: string;
  nombre: string;
  cuit: string | null;
  condicion_iva: CondicionIva;
  domicilio_fiscal: string | null;
  inicio_actividades: string | null;
  numero_iibb: string | null;
  jurisdicciones_iibb: string[];
  agente_retencion_iva: boolean;
  agente_retencion_ganancias: boolean;
  agente_retencion_iibb: boolean;
  agente_percepcion_iva: boolean;
  agente_percepcion_iibb: boolean;
  es_empleador: boolean;
  retenciones_sicoss: boolean;
}

export default function PerfilForm({ empresa, esAdmin }: { empresa: Empresa; esAdmin: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  const [nombre, setNombre] = useState(empresa.nombre);
  const [cuit, setCuit] = useState(empresa.cuit ?? "");
  const [condicionIva, setCondicionIva] = useState<CondicionIva>(empresa.condicion_iva);
  const [domicilioFiscal, setDomicilioFiscal] = useState(empresa.domicilio_fiscal ?? "");
  const [inicioActividades, setInicioActividades] = useState(empresa.inicio_actividades ?? "");
  const [numeroIibb, setNumeroIibb] = useState(empresa.numero_iibb ?? "");
  const [jurisdicciones, setJurisdicciones] = useState<Set<string>>(new Set(empresa.jurisdicciones_iibb));
  const [agenteRetIva, setAgenteRetIva] = useState(empresa.agente_retencion_iva);
  const [agenteRetGanancias, setAgenteRetGanancias] = useState(empresa.agente_retencion_ganancias);
  const [agenteRetIibb, setAgenteRetIibb] = useState(empresa.agente_retencion_iibb);
  const [agentePercIva, setAgentePercIva] = useState(empresa.agente_percepcion_iva);
  const [agentePercIibb, setAgentePercIibb] = useState(empresa.agente_percepcion_iibb);
  const [esEmpleador, setEsEmpleador] = useState(empresa.es_empleador);
  const [retencionesSicoss, setRetencionesSicoss] = useState(empresa.retenciones_sicoss);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  function toggleJurisdiccion(j: string) {
    setJurisdicciones((prev) => {
      const next = new Set(prev);
      if (next.has(j)) next.delete(j);
      else next.add(j);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGuardado(false);

    const { error } = await supabase
      .from("empresas")
      .update({
        nombre,
        cuit: cuit || null,
        condicion_iva: condicionIva,
        domicilio_fiscal: domicilioFiscal || null,
        inicio_actividades: inicioActividades || null,
        numero_iibb: numeroIibb || null,
        jurisdicciones_iibb: Array.from(jurisdicciones),
        agente_retencion_iva: agenteRetIva,
        agente_retencion_ganancias: agenteRetGanancias,
        agente_retencion_iibb: agenteRetIibb,
        agente_percepcion_iva: agentePercIva,
        agente_percepcion_iibb: agentePercIibb,
        es_empleador: esEmpleador,
        retenciones_sicoss: retencionesSicoss,
      })
      .eq("id", empresa.id);

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setGuardado(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {!esAdmin && (
        <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-ink-soft">
          Solo un administrador de la empresa puede editar estos datos. Podés verlos pero no guardar cambios.
        </p>
      )}

      <fieldset disabled={!esAdmin} className="space-y-6 disabled:opacity-70">
        <div className="grid grid-cols-1 gap-4 rounded-lg border bg-surface p-4 shadow-sm sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-ink-soft">Razón Social</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft">CUIT</label>
            <input
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="20-12345678-9"
              className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft">Condición ante el IVA</label>
            <select
              value={condicionIva}
              onChange={(e) => setCondicionIva(e.target.value as CondicionIva)}
              className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
            >
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributo">Monotributo</option>
              <option value="exento">Exento</option>
              <option value="consumidor_final">Consumidor Final</option>
              <option value="no_categorizado">No Categorizado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft">N° de Inscripción IIBB</label>
            <input
              value={numeroIibb}
              onChange={(e) => setNumeroIibb(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft">Inicio de Actividades</label>
            <input
              type="date"
              value={inicioActividades}
              onChange={(e) => setInicioActividades(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft">Domicilio Fiscal</label>
            <input
              value={domicilioFiscal}
              onChange={(e) => setDomicilioFiscal(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-medium text-ink">Jurisdicciones de Ingresos Brutos</h2>
          <p className="mb-3 text-xs text-ink-soft">
            Marcá las provincias donde tenés inscripción de IIBB (Convenio Multilateral si es más de una).
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
            {JURISDICCIONES.map((j) => (
              <label key={j} className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={jurisdicciones.has(j)}
                  onChange={() => toggleJurisdiccion(j)}
                />
                {j}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-ink">Régimen Laboral</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={esEmpleador} onChange={(e) => setEsEmpleador(e.target.checked)} />
              Es empleador (tiene personal en relación de dependencia)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={retencionesSicoss}
                onChange={(e) => setRetencionesSicoss(e.target.checked)}
              />
              Retiene aportes de la seguridad social a sus empleados (SICOSS/F.931 — jubilación, obra
              social, PAMI del sueldo del empleado, distinto de las contribuciones patronales)
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-ink">Agente de Retención</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={agenteRetIva} onChange={(e) => setAgenteRetIva(e.target.checked)} />
                IVA
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={agenteRetGanancias}
                  onChange={(e) => setAgenteRetGanancias(e.target.checked)}
                />
                Ganancias
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={agenteRetIibb} onChange={(e) => setAgenteRetIibb(e.target.checked)} />
                Ingresos Brutos
              </label>
            </div>
          </div>
          <div className="rounded-lg border bg-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-ink">Agente de Percepción</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={agentePercIva} onChange={(e) => setAgentePercIva(e.target.checked)} />
                IVA
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={agentePercIibb}
                  onChange={(e) => setAgentePercIibb(e.target.checked)}
                />
                Ingresos Brutos
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {guardado && <p className="text-sm text-accent">Guardado</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
