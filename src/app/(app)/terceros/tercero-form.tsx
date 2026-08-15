"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionIva, TipoTercero } from "@/lib/types";
import { TASAS_IIBB } from "@/lib/iibb";
import { Card, Field, Input, Select, Button } from "@/components/ui";

interface Cuenta {
  id: string;
  codigo: string;
  nombre: string;
}

export default function TerceroForm({ empresaId, cuentas }: { empresaId: string; cuentas: Cuenta[] }) {
  const router = useRouter();
  const supabase = createClient();

  // Datos básicos (obligatorios)
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [condicionIva, setCondicionIva] = useState<CondicionIva>("consumidor_final");
  const [categoria, setCategoria] = useState("");
  const [cuentaGastoId, setCuentaGastoId] = useState("");
  const [cuentaPasivoId, setCuentaPasivoId] = useState("");

  // Datos opcionales
  const [tipo, setTipo] = useState<TipoTercero>("cliente");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [telefono, setTelefono] = useState("");
  const [contacto, setContacto] = useState("");
  const [nroIibb, setNroIibb] = useState("");
  const [email, setEmail] = useState("");
  const [paginaWeb, setPaginaWeb] = useState("");

  // Retenciones
  const [sujetoIibb, setSujetoIibb] = useState(false);
  const [tasaIibb, setTasaIibb] = useState(0);
  const [sujetoIva, setSujetoIva] = useState(false);
  const [tasaIva, setTasaIva] = useState(0);
  const [sujetoGanancias, setSujetoGanancias] = useState(false);
  const [inscriptoGanancias, setInscriptoGanancias] = useState(false);
  const [tasaGanancias, setTasaGanancias] = useState(0);
  const [sujetoSuss, setSujetoSuss] = useState(false);
  const [tasaSuss, setTasaSuss] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!razonSocial || !cuit || !categoria || !cuentaGastoId || !cuentaPasivoId) {
      setError("Completá los campos obligatorios (*)");
      return;
    }

    setLoading(true);
    setError(null);
    const { error } = await supabase.from("terceros").insert({
      empresa_id: empresaId,
      razon_social: razonSocial,
      tipo,
      cuit,
      condicion_iva: condicionIva,
      categoria,
      cuenta_gasto_id: cuentaGastoId,
      cuenta_pasivo_id: cuentaPasivoId,
      direccion: direccion || null,
      localidad: localidad || null,
      provincia: provincia || null,
      codigo_postal: codigoPostal || null,
      telefono: telefono || null,
      contacto: contacto || null,
      nro_ingresos_brutos: nroIibb || null,
      email: email || null,
      pagina_web: paginaWeb || null,
      sujeto_retencion_iibb: sujetoIibb,
      tasa_retencion_iibb: tasaIibb,
      sujeto_retencion_iva: sujetoIva,
      tasa_retencion_iva: tasaIva,
      sujeto_retencion_ganancias: sujetoGanancias,
      inscripto_ganancias: inscriptoGanancias,
      tasa_retencion_ganancias: tasaGanancias,
      sujeto_retencion_suss: sujetoSuss,
      tasa_retencion_suss: tasaSuss,
    });
    setLoading(false);
    if (error) {
      setError(error.code === "23505" ? "Ya existe un tercero con ese CUIT." : error.message);
      return;
    }
    setRazonSocial("");
    setCuit("");
    setCategoria("");
    setCuentaGastoId("");
    setCuentaPasivoId("");
    setDireccion("");
    setLocalidad("");
    setProvincia("");
    setCodigoPostal("");
    setTelefono("");
    setContacto("");
    setNroIibb("");
    setEmail("");
    setPaginaWeb("");
    setSujetoIibb(false);
    setTasaIibb(0);
    setSujetoIva(false);
    setTasaIva(0);
    setSujetoGanancias(false);
    setInscriptoGanancias(false);
    setTasaGanancias(0);
    setSujetoSuss(false);
    setTasaSuss(0);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card title="Nuevo Cliente / Proveedor">
        <div className="space-y-4 p-[1.15rem]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Razón Social *">
              <Input required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="CUIT *">
              <Input required value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="20-12345678-9" className="w-full normal-case" />
            </Field>
            <Field label="Tipo">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoTercero)} className="w-full normal-case">
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
                <option value="ambos">Ambos</option>
              </Select>
            </Field>
            <Field label="Condición IVA *">
              <Select value={condicionIva} onChange={(e) => setCondicionIva(e.target.value as CondicionIva)} className="w-full normal-case">
                <option value="responsable_inscripto">Responsable Inscripto</option>
                <option value="monotributo">Monotributo</option>
                <option value="exento">Exento</option>
                <option value="consumidor_final">Consumidor Final</option>
                <option value="no_categorizado">No Categorizado</option>
              </Select>
            </Field>
            <Field label="Categoría *">
              <Input
                required
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Proveedores de mercadería, Proveedores de servicios, etc."
                className="w-full normal-case"
              />
            </Field>
            <Field label="N° Ingresos Brutos">
              <Input value={nroIibb} onChange={(e) => setNroIibb(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Cuenta Gasto/Activo *">
              <Select required value={cuentaGastoId} onChange={(e) => setCuentaGastoId(e.target.value)} className="w-full normal-case">
                <option value="">Seleccionar...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cuenta Pasivo *">
              <Select required value={cuentaPasivoId} onChange={(e) => setCuentaPasivoId(e.target.value)} className="w-full normal-case">
                <option value="">Seleccionar...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Teléfono">
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Contacto">
              <Input value={contacto} onChange={(e) => setContacto(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Página Web">
              <Input value={paginaWeb} onChange={(e) => setPaginaWeb(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Dirección">
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Localidad">
              <Input value={localidad} onChange={(e) => setLocalidad(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Provincia">
              <Input value={provincia} onChange={(e) => setProvincia(e.target.value)} className="w-full normal-case" />
            </Field>
            <Field label="Código Postal">
              <Input value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} className="w-full normal-case" />
            </Field>
          </div>

          <div className="rounded-[6px] border border-line-strong p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[.05em] text-ink-2">
              Retenciones que se le practican a este proveedor
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[12px] text-ink-2">
                  <input type="checkbox" checked={sujetoIibb} onChange={(e) => setSujetoIibb(e.target.checked)} />
                  Sujeto a Retención IIBB
                </label>
                {sujetoIibb && (
                  <Select value={tasaIibb} onChange={(e) => setTasaIibb(Number(e.target.value))} className="w-full normal-case">
                    <option value={0}>Elegir tasa...</option>
                    {TASAS_IIBB.map((t) => (
                      <option key={t} value={t}>
                        {t}%
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[12px] text-ink-2">
                  <input type="checkbox" checked={sujetoIva} onChange={(e) => setSujetoIva(e.target.checked)} />
                  Sujeto a Retención IVA
                </label>
                {sujetoIva && (
                  <Input
                    type="number"
                    step="0.01"
                    value={tasaIva}
                    onChange={(e) => setTasaIva(Number(e.target.value))}
                    placeholder="Tasa %"
                    className="w-full normal-case"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[12px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={sujetoGanancias}
                    onChange={(e) => setSujetoGanancias(e.target.checked)}
                  />
                  Sujeto a Retención Ganancias
                </label>
                {sujetoGanancias && (
                  <>
                    <label className="flex items-center gap-2 text-[11px] text-ink-2">
                      <input
                        type="checkbox"
                        checked={inscriptoGanancias}
                        onChange={(e) => setInscriptoGanancias(e.target.checked)}
                      />
                      Inscripto en Ganancias
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tasaGanancias}
                      onChange={(e) => setTasaGanancias(Number(e.target.value))}
                      placeholder="Tasa %"
                      className="w-full normal-case"
                    />
                  </>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[12px] text-ink-2">
                  <input type="checkbox" checked={sujetoSuss} onChange={(e) => setSujetoSuss(e.target.checked)} />
                  Sujeto a Retención SUSS
                </label>
                {sujetoSuss && (
                  <Input
                    type="number"
                    step="0.01"
                    value={tasaSuss}
                    onChange={(e) => setTasaSuss(Number(e.target.value))}
                    placeholder="Tasa %"
                    className="w-full normal-case"
                  />
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-[11px] text-bad">{error}</p>}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
