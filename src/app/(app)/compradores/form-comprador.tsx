"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Campo, Input } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Modal } from "@/components/ui/modal";
import { AvisoConsulta, useConsultaDocumento } from "@/components/consulta-documento";
import type { Comprador } from "@/lib/tipos";
import { cambiarEstadoComprador, guardarComprador } from "./acciones";

function Form({ inicial, onExito }: { inicial?: Comprador; onExito: () => void }) {
  const ruc = useRef<HTMLInputElement>(null);
  const razon = useRef<HTMLInputElement>(null);
  const dir = useRef<HTMLInputElement>(null);
  const tel = useRef<HTMLInputElement>(null);
  const { estado, consultar, limpiar } = useConsultaDocumento("comprador");

  // Con el RUC completo se consulta SUNAT (o se reutiliza lo ya guardado, sin gastar consulta)
  async function buscar() {
    const d = await consultar("RUC", ruc.current?.value ?? "");
    if (!d) return;
    if (razon.current && d.nombre) razon.current.value = d.nombre;
    if (dir.current && d.direccion && !dir.current.value) dir.current.value = d.direccion;
    if (tel.current && d.telefono && !tel.current.value) tel.current.value = d.telefono;
    if (tel.current && !tel.current.value) tel.current.focus();
  }

  return (
    <FormularioAccion accion={guardarComprador} mensajeExito={inicial ? "Comprador actualizado." : "Comprador creado."} onExito={onExito} textoBoton={inicial ? "Guardar cambios" : "Crear comprador"}>
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <Campo etiqueta="RUC">
        <div className="flex gap-1.5">
          <Input
            ref={ruc}
            name="ruc"
            inputMode="numeric"
            maxLength={11}
            defaultValue={inicial?.ruc ?? ""}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (v !== e.target.value) e.target.value = v;
              if (!inicial && v.length === 11) buscar();
              else if (estado.fase !== "libre") limpiar();
            }}
          />
          <Boton variante="secundario" onClick={buscar} disabled={estado.fase === "consultando"} className="shrink-0 px-3" aria-label="Consultar SUNAT" title="Consultar SUNAT"><Search className="size-4" /></Boton>
        </div>
      </Campo>
      <AvisoConsulta estado={estado} tipo="RUC" />
      <Campo etiqueta="Razón social"><Input ref={razon} name="razon_social" required defaultValue={inicial?.razon_social ?? ""} /></Campo>
      <Campo etiqueta="Dirección"><Input ref={dir} name="direccion" defaultValue={inicial?.direccion ?? ""} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Celular"><Input ref={tel} name="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" defaultValue={inicial?.telefono ?? ""} /></Campo>
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
