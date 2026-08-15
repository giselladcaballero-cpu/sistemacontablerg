"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { parseArchivoPlanCuentas, type ErrorImportacion, type FilaImportada } from "@/lib/plan-cuentas-import";

type Estado =
  | { paso: "elegir" }
  | { paso: "preview"; filas: FilaImportada[]; errores: ErrorImportacion[]; nombreArchivo: string }
  | { paso: "importando" }
  | { paso: "resultado"; agregadas: number; actualizadas: number; desactivadas: number; noEliminadas: number };

export default function PlanCuentasImport({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>({ paso: "elegir" });
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const { filas, errores } = await parseArchivoPlanCuentas(file);
      if (filas.length === 0) {
        setError("No se encontraron cuentas válidas en el archivo.");
        return;
      }
      setEstado({ paso: "preview", filas, errores, nombreArchivo: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo");
    }
  }

  async function confirmarImportacion(filas: FilaImportada[]) {
    setEstado({ paso: "importando" });
    setError(null);

    const { data: existentes } = await supabase
      .from("plan_cuentas")
      .select("id, codigo")
      .eq("empresa_id", empresaId);

    const existentesPorCodigo = new Map((existentes ?? []).map((c) => [c.codigo, c.id]));
    const codigosImportados = new Set(filas.map((f) => f.codigo));

    let agregadas = 0;
    let actualizadas = 0;

    for (const fila of filas) {
      const idExistente = existentesPorCodigo.get(fila.codigo);
      if (idExistente) {
        const { error: updError } = await supabase
          .from("plan_cuentas")
          .update({
            nombre: fila.nombre,
            tipo: fila.tipo,
            naturaleza: fila.naturaleza,
            imputable: fila.imputable,
            activa: true,
          })
          .eq("id", idExistente);
        if (!updError) actualizadas++;
      } else {
        const { error: insError } = await supabase.from("plan_cuentas").insert({
          empresa_id: empresaId,
          codigo: fila.codigo,
          nombre: fila.nombre,
          tipo: fila.tipo,
          naturaleza: fila.naturaleza,
          imputable: fila.imputable,
          activa: true,
        });
        if (!insError) agregadas++;
      }
    }

    // Las cuentas que ya no están en el archivo se desactivan (no se borran: podrían tener
    // movimientos históricos y las columnas relacionadas no permiten eliminarlas).
    const aDesactivar = (existentes ?? []).filter((c) => !codigosImportados.has(c.codigo));
    let desactivadas = 0;
    if (aDesactivar.length > 0) {
      const { error: deactError } = await supabase
        .from("plan_cuentas")
        .update({ activa: false })
        .in(
          "id",
          aDesactivar.map((c) => c.id)
        );
      if (!deactError) desactivadas = aDesactivar.length;
    }

    setEstado({ paso: "resultado", agregadas, actualizadas, desactivadas, noEliminadas: 0 });
    router.refresh();
  }

  if (estado.paso === "elegir") {
    return (
      <Card title="Importar Plan de Cuentas">
        <div className="space-y-2 p-[1.15rem]">
          <p className="text-[11px] text-ink-2">
            Subí un archivo .csv o .xlsx con las columnas <strong>código, nombre, tipo</strong> (Activo /
            Pasivo / Patrimonio Neto / Ingreso / Egreso) e <strong>imputable</strong> (Sí/No). Las cuentas
            del archivo reemplazan al plan activo: las nuevas se agregan, las existentes (mismo código) se
            actualizan, y las que ya no estén en el archivo se desactivan (no se borran, para no perder
            movimientos históricos).
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFile}
            className="hidden"
          />
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            Elegir archivo...
          </Button>
          {error && <p className="text-[11px] text-bad">{error}</p>}
        </div>
      </Card>
    );
  }

  if (estado.paso === "preview") {
    return (
      <Card title={`Importar Plan de Cuentas — ${estado.nombreArchivo}`}>
        <div className="space-y-3 p-[1.15rem]">
          <p className="text-[12.5px] text-ink">
            Se encontraron <strong className="text-accent">{estado.filas.length}</strong> cuentas válidas.
          </p>
          {estado.errores.length > 0 && (
            <div className="rounded-[6px] border border-bad/30 bg-bad/[.08] p-2.5">
              <p className="mb-1 text-[11px] font-medium text-bad">
                {estado.errores.length} fila(s) con problemas (no se van a importar):
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-ink-2">
                {estado.errores.map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="max-h-64 overflow-y-auto rounded-[6px] border border-line">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th className="px-2 py-1.5 text-left font-medium text-ink-3">Código</th>
                  <th className="px-2 py-1.5 text-left font-medium text-ink-3">Nombre</th>
                  <th className="px-2 py-1.5 text-left font-medium text-ink-3">Tipo</th>
                  <th className="px-2 py-1.5 text-left font-medium text-ink-3">Imputable</th>
                </tr>
              </thead>
              <tbody>
                {estado.filas.map((f, i) => (
                  <tr key={i} className="border-b border-line last:border-b-0">
                    <td className="px-2 py-1 font-mono text-ink-2">{f.codigo}</td>
                    <td className="px-2 py-1 text-ink">{f.nombre}</td>
                    <td className="px-2 py-1 capitalize text-ink-2">{f.tipo.replace("_", " ")}</td>
                    <td className="px-2 py-1 text-ink-2">{f.imputable ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => confirmarImportacion(estado.filas)}>
              Reemplazar Plan de Cuentas
            </Button>
            <Button onClick={() => setEstado({ paso: "elegir" })}>Cancelar</Button>
          </div>
        </div>
      </Card>
    );
  }

  if (estado.paso === "importando") {
    return (
      <Card title="Importar Plan de Cuentas">
        <p className="p-[1.15rem] text-[12.5px] text-ink-2">Importando...</p>
      </Card>
    );
  }

  return (
    <Card title="Importar Plan de Cuentas">
      <div className="space-y-2 p-[1.15rem]">
        <p className="text-[12.5px] text-good">Importación completa.</p>
        <ul className="text-[12px] text-ink-2">
          <li>{estado.agregadas} cuenta(s) agregada(s)</li>
          <li>{estado.actualizadas} cuenta(s) actualizada(s)</li>
          <li>{estado.desactivadas} cuenta(s) desactivada(s) (ya no están en el archivo)</li>
        </ul>
        <Button variant="primary" onClick={() => setEstado({ paso: "elegir" })}>
          Importar otro archivo
        </Button>
      </div>
    </Card>
  );
}
