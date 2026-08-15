"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionIva } from "@/lib/types";
import { Card, Field, Input, Select, Button } from "@/components/ui";

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
  retenciones_suss: boolean;
  periodicidad_sicore: "mensual" | "quincenal";
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
  const [retencionesSuss, setRetencionesSuss] = useState(empresa.retenciones_suss);
  const [periodicidadSicore, setPeriodicidadSicore] = useState<"mensual" | "quincenal">(empresa.periodicidad_sicore);

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
        retenciones_suss: retencionesSuss,
        periodicidad_sicore: periodicidadSicore,
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
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      {!esAdmin && (
        <p className="rounded-[6px] bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">
          Solo un administrador de la empresa puede editar estos datos. Podés verlos pero no guardar cambios.
        </p>
      )}

      <fieldset disabled={!esAdmin} className="space-y-5 disabled:opacity-70">
        <Card>
          <div className="grid grid-cols-1 gap-4 p-[1.15rem] sm:grid-cols-2">
            <Field label="Razón Social">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="CUIT">
              <Input value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="20-12345678-9" className="w-full normal-case" />
            </Field>
            <Field label="Condición ante el IVA">
              <Select value={condicionIva} onChange={(e) => setCondicionIva(e.target.value as CondicionIva)} className="w-full normal-case">
                <option value="responsable_inscripto">Responsable Inscripto</option>
                <option value="monotributo">Monotributo</option>
                <option value="exento">Exento</option>
                <option value="consumidor_final">Consumidor Final</option>
                <option value="no_categorizado">No Categorizado</option>
              </Select>
            </Field>
            <Field label="N° de Inscripción IIBB">
              <Input value={numeroIibb} onChange={(e) => setNumeroIibb(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Inicio de Actividades">
              <Input type="date" value={inicioActividades} onChange={(e) => setInicioActividades(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Domicilio Fiscal">
              <Input value={domicilioFiscal} onChange={(e) => setDomicilioFiscal(e.target.value)} className="w-full normal-case" />
            </Field>
          </div>
        </Card>

        <Card title="Jurisdicciones de Ingresos Brutos">
          <div className="p-[1.15rem]">
            <p className="mb-3 text-[11px] text-ink-2">
              Marcá las provincias donde tenés inscripción de IIBB (Convenio Multilateral si es más de una).
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
              {JURISDICCIONES.map((j) => (
                <label key={j} className="flex items-center gap-2 text-[12px] text-ink-2">
                  <input type="checkbox" checked={jurisdicciones.has(j)} onChange={() => toggleJurisdiccion(j)} />
                  {j}
                </label>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Régimen Laboral">
          <div className="space-y-2 p-[1.15rem]">
            <label className="flex items-center gap-2 text-[12px] text-ink-2">
              <input type="checkbox" checked={esEmpleador} onChange={(e) => setEsEmpleador(e.target.checked)} />
              Es empleador (tiene personal en relación de dependencia)
            </label>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card title="Agente de Retención">
            <div className="space-y-2 p-[1.15rem]">
              <label className="flex items-center gap-2 text-[12px] text-ink-2">
                <input type="checkbox" checked={agenteRetIva} onChange={(e) => setAgenteRetIva(e.target.checked)} />
                IVA
              </label>
              <label className="flex items-center gap-2 text-[12px] text-ink-2">
                <input
                  type="checkbox"
                  checked={agenteRetGanancias}
                  onChange={(e) => setAgenteRetGanancias(e.target.checked)}
                />
                Ganancias
              </label>
              <label className="flex items-center gap-2 text-[12px] text-ink-2">
                <input
                  type="checkbox"
                  checked={retencionesSuss}
                  onChange={(e) => setRetencionesSuss(e.target.checked)}
                />
                SUSS (a proveedores de servicios con personal: limpieza, seguridad, construcción,
                cooperativas de trabajo — no es sobre tus propios empleados)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-ink-2">
                <input type="checkbox" checked={agenteRetIibb} onChange={(e) => setAgenteRetIibb(e.target.checked)} />
                Ingresos Brutos
              </label>
            </div>
          </Card>
          <Card title="Agente de Percepción">
            <div className="space-y-2 p-[1.15rem]">
              <label className="flex items-center gap-2 text-[12px] text-ink-2">
                <input type="checkbox" checked={agentePercIva} onChange={(e) => setAgentePercIva(e.target.checked)} />
                IVA
              </label>
              <label className="flex items-center gap-2 text-[12px] text-ink-2">
                <input
                  type="checkbox"
                  checked={agentePercIibb}
                  onChange={(e) => setAgentePercIibb(e.target.checked)}
                />
                Ingresos Brutos
              </label>
            </div>
          </Card>
        </div>

        <Card title="Depósito de retenciones (SICORE / SIRCAR)">
          <div className="p-[1.15rem]">
            <p className="mb-3 text-[11px] text-ink-2">
              La frecuencia de depósito depende del monto total retenido/percibido en el año anterior
              (no todos los agentes tienen el mismo vencimiento). Elegí la que te corresponda para que
              en Vencimientos Impositivos aparezcan las fechas correctas.
            </p>
            <Field label="Periodicidad de depósito">
              <Select
                value={periodicidadSicore}
                onChange={(e) => setPeriodicidadSicore(e.target.value as "mensual" | "quincenal")}
                className="w-full max-w-xs normal-case"
              >
                <option value="quincenal">Quincenal (2 depósitos por mes)</option>
                <option value="mensual">Mensual (1 depósito por mes)</option>
              </Select>
            </Field>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {guardado && <p className="text-[12px] text-good">Guardado</p>}
          {error && <p className="text-[12px] text-bad">{error}</p>}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
