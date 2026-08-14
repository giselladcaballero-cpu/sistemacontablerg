"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionIva, TipoTercero } from "@/lib/types";
import { TASAS_IIBB } from "@/lib/iibb";

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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-medium text-ink">Nuevo Cliente / Proveedor</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-ink-soft">Razón Social *</label>
          <input
            required
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">CUIT *</label>
          <input
            required
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="20-12345678-9"
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoTercero)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="cliente">Cliente</option>
            <option value="proveedor">Proveedor</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Condición IVA *</label>
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
          <label className="block text-xs font-medium text-ink-soft">Categoría *</label>
          <input
            required
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Proveedores de mercadería, Proveedores de servicios, etc."
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">N° Ingresos Brutos</label>
          <input
            value={nroIibb}
            onChange={(e) => setNroIibb(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Cuenta Gasto/Activo *</label>
          <select
            required
            value={cuentaGastoId}
            onChange={(e) => setCuentaGastoId(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar...</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Cuenta Pasivo *</label>
          <select
            required
            value={cuentaPasivoId}
            onChange={(e) => setCuentaPasivoId(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar...</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Teléfono</label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Contacto</label>
          <input
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Página Web</label>
          <input
            value={paginaWeb}
            onChange={(e) => setPaginaWeb(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Dirección</label>
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Localidad</label>
          <input
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Provincia</label>
          <input
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Código Postal</label>
          <input
            value={codigoPostal}
            onChange={(e) => setCodigoPostal(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="rounded-md border border-line p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Retenciones que se le practican a este proveedor
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={sujetoIibb} onChange={(e) => setSujetoIibb(e.target.checked)} />
              Sujeto a Retención IIBB
            </label>
            {sujetoIibb && (
              <select
                value={tasaIibb}
                onChange={(e) => setTasaIibb(Number(e.target.value))}
                className="w-full rounded-md border border-line px-2 py-1 text-sm"
              >
                <option value={0}>Elegir tasa...</option>
                {TASAS_IIBB.map((t) => (
                  <option key={t} value={t}>
                    {t}%
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={sujetoIva} onChange={(e) => setSujetoIva(e.target.checked)} />
              Sujeto a Retención IVA
            </label>
            {sujetoIva && (
              <input
                type="number"
                step="0.01"
                value={tasaIva}
                onChange={(e) => setTasaIva(Number(e.target.value))}
                placeholder="Tasa %"
                className="w-full rounded-md border border-line px-2 py-1 text-sm"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={sujetoGanancias}
                onChange={(e) => setSujetoGanancias(e.target.checked)}
              />
              Sujeto a Retención Ganancias
            </label>
            {sujetoGanancias && (
              <>
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={inscriptoGanancias}
                    onChange={(e) => setInscriptoGanancias(e.target.checked)}
                  />
                  Inscripto en Ganancias
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tasaGanancias}
                  onChange={(e) => setTasaGanancias(Number(e.target.value))}
                  placeholder="Tasa %"
                  className="w-full rounded-md border border-line px-2 py-1 text-sm"
                />
              </>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={sujetoSuss} onChange={(e) => setSujetoSuss(e.target.checked)} />
              Sujeto a Retención SUSS
            </label>
            {sujetoSuss && (
              <input
                type="number"
                step="0.01"
                value={tasaSuss}
                onChange={(e) => setTasaSuss(Number(e.target.value))}
                placeholder="Tasa %"
                className="w-full rounded-md border border-line px-2 py-1 text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
