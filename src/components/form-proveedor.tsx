"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { Campo, Input, Select } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Boton } from "@/components/ui/boton";
import type { Proveedor, Resultado } from "@/lib/tipos";

type Accion = (prev: Resultado | null, fd: FormData) => Promise<Resultado>;

/** Alta/edición de proveedor, con consulta opcional a RENIEC/SUNAT. */
export function FormProveedor({
  accion, inicial, onExito, textoBoton = "Guardar proveedor",
}: {
  accion: Accion;
  inicial?: Partial<Proveedor> & { notas?: string | null };
  onExito?: (p: unknown) => void;
  textoBoton?: string;
}) {
  const [tipo, setTipo] = useState(inicial?.tipo_doc ?? "DNI");
  const [aviso, setAviso] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  const nroRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  async function consultar() {
    const numero = nroRef.current?.value.trim() ?? "";
    setAviso(null);
    setConsultando(true);
    try {
      const r = await fetch(`/api/consulta-doc?tipo=${tipo}&numero=${numero}`);
      if (r.status === 501) {
        setAviso("La consulta automática no está configurada: ingrese el nombre a mano.");
      } else if (!r.ok) {
        setAviso("No se encontró el documento. Ingrese el nombre a mano.");
      } else {
        const d = await r.json();
        if (nombreRef.current && d.nombre) nombreRef.current.value = d.nombre;
        if (dirRef.current && d.direccion) dirRef.current.value = d.direccion;
      }
    } finally {
      setConsultando(false);
    }
  }

  return (
    <FormularioAccion accion={accion} onExito={onExito} textoBoton={textoBoton}>
      {inicial?.id && <input type="hidden" name="id" value={inicial.id} />}
      <div className="grid grid-cols-[7.5rem_1fr] gap-2">
        <Campo etiqueta="Documento">
          <Select name="tipo_doc" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
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
                maxLength={tipo === "DNI" ? 8 : tipo === "RUC" ? 11 : 15}
                required
              />
              {(tipo === "DNI" || tipo === "RUC") && (
                <Boton variante="secundario" onClick={consultar} disabled={consultando} aria-label="Consultar" className="shrink-0 px-3">
                  <Search className="size-4" />
                </Boton>
              )}
            </div>
          </Campo>
        ) : <div />}
      </div>
      {aviso && <p className="text-xs text-amber-700">{aviso}</p>}
      <Campo etiqueta={tipo === "RUC" ? "Razón social" : "Nombre completo"}>
        <Input ref={nombreRef} name="nombre" defaultValue={inicial?.nombre ?? ""} required />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Teléfono">
          <Input name="telefono" type="tel" inputMode="tel" defaultValue={inicial?.telefono ?? ""} />
        </Campo>
        <Campo etiqueta="Dirección">
          <Input ref={dirRef} name="direccion" defaultValue={inicial?.direccion ?? ""} />
        </Campo>
      </div>
    </FormularioAccion>
  );
}
