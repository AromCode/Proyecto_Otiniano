"use client";

import { useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Campo, Input, Select } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Boton } from "@/components/ui/boton";
import { AvisoConsulta, ruc10DesdeDni, useConsultaDocumento } from "@/components/consulta-documento";
import type { Proveedor, Resultado } from "@/lib/tipos";

type Accion = (prev: Resultado | null, fd: FormData) => Promise<Resultado>;

/**
 * Alta/edición de proveedor. Al crear, cuando el DNI (8) o RUC (11) está completo se consulta solo
 * RENIEC/SUNAT y se llenan nombre y dirección; lo ya consultado o registrado no gasta consulta.
 */
export function FormProveedor({
  accion, inicial, onExito, textoBoton = "Guardar proveedor",
}: {
  accion: Accion;
  inicial?: Partial<Proveedor> & { notas?: string | null };
  onExito?: (p: unknown) => void;
  textoBoton?: string;
}) {
  const [tipo, setTipo] = useState(inicial?.tipo_doc ?? "DNI");
  const { estado, consultar, limpiar } = useConsultaDocumento("proveedor");
  const nroRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const telRef = useRef<HTMLInputElement>(null);
  // Dirección fiscal por el RUC 10 de la persona (RENIEC no da dirección ni celular)
  const sunat = useConsultaDocumento("proveedor");
  const [sinDireccion, setSinDireccion] = useState(false);
  const esNuevo = !inicial?.id;
  const largo = tipo === "DNI" ? 8 : tipo === "RUC" ? 11 : 15;

  async function buscar() {
    sunat.limpiar();
    setSinDireccion(false);
    const d = await consultar(tipo, nroRef.current?.value ?? "");
    if (!d) return;
    if (nombreRef.current && d.nombre) nombreRef.current.value = d.nombre;
    if (dirRef.current && d.direccion && !dirRef.current.value) dirRef.current.value = d.direccion;
    if (telRef.current && d.telefono && !telRef.current.value) telRef.current.value = d.telefono;
    setSinDireccion(tipo === "DNI" && !d.registrado && !dirRef.current?.value);
    // Lo único que falta escribir es el celular: el cursor va directo ahí
    if (telRef.current && !telRef.current.value) telRef.current.focus();
  }

  async function buscarDireccion() {
    const ruc = ruc10DesdeDni(nroRef.current?.value.trim() ?? "");
    if (!ruc) return;
    const d = await sunat.consultar("RUC", ruc);
    if (d?.direccion && dirRef.current) {
      dirRef.current.value = d.direccion;
      setSinDireccion(false);
    }
  }

  return (
    <FormularioAccion accion={accion} onExito={onExito} textoBoton={textoBoton} mensajeExito={inicial ? "Proveedor actualizado." : "Proveedor guardado."}>
      {inicial?.id && <input type="hidden" name="id" value={inicial.id} />}
      <div className="grid grid-cols-[7.5rem_1fr] gap-2">
        <Campo etiqueta="Documento">
          <Select name="tipo_doc" value={tipo} onChange={(e) => { setTipo(e.target.value as typeof tipo); limpiar(); }}>
            <option value="DNI">DNI</option>
            <option value="RUC">RUC</option>
            <option value="CE">C. Extranjería</option>
            <option value="SIN_DOC">Sin documento</option>
          </Select>
        </Campo>
        {tipo !== "SIN_DOC" ? (
          <Campo etiqueta="Número">
            <div className="flex gap-1.5">
              <Input
                ref={nroRef}
                name="nro_doc"
                inputMode="numeric"
                defaultValue={inicial?.nro_doc ?? ""}
                maxLength={largo}
                required
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if (tipo !== "CE" && v !== e.target.value) e.target.value = v;
                  if (esNuevo && (tipo === "DNI" || tipo === "RUC") && v.length === largo) buscar();
                  else if (estado.fase !== "libre") limpiar();
                }}
              />
              {(tipo === "DNI" || tipo === "RUC") && (
                <Boton variante="secundario" onClick={buscar} disabled={estado.fase === "consultando"}
                  aria-label={`Consultar ${tipo === "DNI" ? "RENIEC" : "SUNAT"}`} title="Consultar RENIEC/SUNAT" className="shrink-0 px-3">
                  <Search className="size-4" />
                </Boton>
              )}
            </div>
          </Campo>
        ) : <div />}
      </div>
      <AvisoConsulta estado={estado} tipo={tipo} />
      {sinDireccion && sunat.estado.fase === "libre" && (
        <button type="button" onClick={buscarDireccion}
          className="flex w-full items-start gap-2 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-left text-xs text-stone-600 hover:bg-stone-50">
          <MapPin className="mt-px size-4 shrink-0 text-marca-600" />
          <span>
            <b className="font-medium text-stone-800">¿Tiene RUC (negocio propio)? Buscar su dirección en SUNAT</b>
            <span className="block">RENIEC solo da el nombre. Usa 1 consulta; si no tiene RUC, escriba la dirección a mano.</span>
          </span>
        </button>
      )}
      {sunat.estado.fase === "consultando" && <p className="flex items-center gap-1.5 text-xs text-stone-500"><Loader2 className="size-3.5 animate-spin" /> Buscando dirección en SUNAT…</p>}
      {sunat.estado.fase === "listo" && sunat.estado.datos.direccion && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700"><MapPin className="size-3.5" /> Dirección fiscal de SUNAT (RUC {ruc10DesdeDni(nroRef.current?.value.trim() ?? "")}).</p>
      )}
      {(sunat.estado.fase === "error" || (sunat.estado.fase === "listo" && !sunat.estado.datos.direccion)) && (
        <p className="text-xs text-amber-700">No tiene RUC con dirección en SUNAT: escríbala a mano.</p>
      )}
      <Campo etiqueta={tipo === "RUC" ? "Razón social" : "Nombre completo"}>
        <Input ref={nombreRef} name="nombre" defaultValue={inicial?.nombre ?? ""} required />
      </Campo>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-stone-700">Tipo de proveedor</legend>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {([["minorista", "Minorista", "Persona que trae poco"], ["mayorista", "Mayorista", "Otro almacén de reciclaje"]] as const).map(([v, t, d]) => (
            <label key={v} className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 p-2.5 has-[:checked]:border-marca-600 has-[:checked]:bg-marca-50">
              <input type="radio" name="clase" value={v} defaultChecked={(inicial?.clase ?? "minorista") === v} className="mt-0.5 size-4 accent-marca-600" />
              <span><b className="block font-medium">{t}</b><span className="text-xs text-stone-500">{d}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Celular">
          <Input ref={telRef} name="telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={15} placeholder="9XX XXX XXX" defaultValue={inicial?.telefono ?? ""} />
        </Campo>
        <Campo etiqueta="Dirección">
          <Input ref={dirRef} name="direccion" defaultValue={inicial?.direccion ?? ""} />
        </Campo>
      </div>
    </FormularioAccion>
  );
}
