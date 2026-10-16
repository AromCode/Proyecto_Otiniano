"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Campo, Input } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Modal } from "@/components/ui/modal";
import type { Comprador } from "@/lib/tipos";
import { cambiarEstadoComprador, guardarComprador } from "./acciones";

function Form({ inicial, onExito }: { inicial?: Comprador; onExito: () => void }) {
  const ruc = useRef<HTMLInputElement>(null);
  const razon = useRef<HTMLInputElement>(null);
  const dir = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function consultar() {
    setAviso(null);
    const r = await fetch(`/api/consulta-doc?tipo=RUC&numero=${ruc.current?.value.trim()}`);
    if (!r.ok) return setAviso(r.status === 501 ? "Consulta no configurada: ingrese los datos a mano." : "RUC no encontrado.");
    const d = await r.json();
    if (razon.current && d.nombre) razon.current.value = d.nombre;
    if (dir.current && d.direccion) dir.current.value = d.direccion;
  }

  return (
    <FormularioAccion accion={guardarComprador} onExito={onExito} textoBoton={inicial ? "Guardar cambios" : "Crear comprador"}>
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <Campo etiqueta="RUC">
        <div className="flex gap-1.5">
          <Input ref={ruc} name="ruc" inputMode="numeric" maxLength={11} defaultValue={inicial?.ruc ?? ""} />
          <Boton variante="secundario" onClick={consultar} className="shrink-0 px-3" aria-label="Consultar RUC"><Search className="size-4" /></Boton>
        </div>
      </Campo>
      {aviso && <p className="text-xs text-amber-700">{aviso}</p>}
      <Campo etiqueta="Razón social"><Input ref={razon} name="razon_social" required defaultValue={inicial?.razon_social ?? ""} /></Campo>
      <Campo etiqueta="Dirección"><Input ref={dir} name="direccion" defaultValue={inicial?.direccion ?? ""} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Teléfono"><Input name="telefono" type="tel" defaultValue={inicial?.telefono ?? ""} /></Campo>
        <Campo etiqueta="Contacto"><Input name="contacto" defaultValue={inicial?.contacto ?? ""} /></Campo>
      </div>
    </FormularioAccion>
  );
}

export function NuevoComprador() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton onClick={() => setAbierto(true)}><Plus className="size-4" /> Nuevo comprador</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo comprador">
        <Form onExito={() => setAbierto(false)} />
      </Modal>
    </>
  );
}

export function EditarComprador({ comprador }: { comprador: Comprador }) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}><Pencil className="size-4" /> Editar</Boton>
      <Boton variante="fantasma" onClick={async () => { await cambiarEstadoComprador(comprador.id, !comprador.activo); router.refresh(); }}>
        {comprador.activo ? "Desactivar" : "Activar"}
      </Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Editar comprador">
        <Form inicial={comprador} onExito={() => setAbierto(false)} />
      </Modal>
    </>
  );
}
