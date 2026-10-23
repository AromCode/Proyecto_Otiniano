"use client";

import { useRef, useState } from "react";
import { HandCoins, Lock, Pencil, Plus, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, InputNumero, Select } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Aviso } from "@/components/ui/basicos";
import { AvisoConsulta, useConsultaDocumento } from "@/components/consulta-documento";
import { hoyLima, nombrePeriodo } from "@/lib/formato";
import { cerrarMes, guardarSocio, registrarAporteRetiro } from "./acciones";

interface SocioEditable { id: string; nombre: string; dni: string | null; porcentaje: number | string; activo: boolean }

/** DNI primero: con los 8 dígitos se trae el nombre de RENIEC (o del registro si ya es proveedor/socio) */
function CamposSocio({ inicial }: { inicial?: SocioEditable }) {
  const { estado, consultar, limpiar } = useConsultaDocumento("socio");
  const dniRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const pctRef = useRef<HTMLInputElement>(null);

  async function buscar() {
    const d = await consultar("DNI", dniRef.current?.value ?? "");
    if (!d) return;
    if (nombreRef.current && d.nombre) nombreRef.current.value = d.nombre;
    if (!d.registrado || d.registrado.tipo !== "socio") pctRef.current?.focus();
  }

  return (
    <>
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="DNI">
          <div className="flex gap-1.5">
            <Input
              ref={dniRef}
              name="dni"
              inputMode="numeric"
              maxLength={8}
              defaultValue={inicial?.dni ?? ""}
              autoFocus={!inicial}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                if (v !== e.target.value) e.target.value = v;
                if (!inicial && v.length === 8) buscar();
                else if (estado.fase !== "libre") limpiar();
              }}
            />
            <Boton variante="secundario" onClick={buscar} disabled={estado.fase === "consultando"} className="shrink-0 px-3"
              aria-label="Consultar RENIEC" title="Consultar RENIEC"><Search className="size-4" /></Boton>
          </div>
        </Campo>
        <Campo etiqueta="Participación %" ayuda="Para repartir la utilidad">
          <InputNumero ref={pctRef} name="porcentaje" required defaultValue={inicial ? String(inicial.porcentaje) : undefined} />
        </Campo>
      </div>
      <AvisoConsulta estado={estado} tipo="DNI" />
      <Campo etiqueta="Nombre completo"><Input ref={nombreRef} name="nombre" required defaultValue={inicial?.nombre} /></Campo>
      {inicial && (
        <Campo etiqueta="Estado">
          <Select name="activo" defaultValue={inicial.activo ? "on" : "off"}>
            <option value="on">Activo</option>
            <option value="off">Inactivo (ya no participa del reparto)</option>
          </Select>
        </Campo>
      )}
    </>
  );
}

export function NuevoSocio() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton onClick={() => setAbierto(true)}><Plus className="size-4" /> Nuevo socio</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo socio">
        <FormularioAccion accion={guardarSocio} onExito={() => setAbierto(false)} textoBoton="Crear socio" mensajeExito="Socio creado.">
          <CamposSocio />
        </FormularioAccion>
      </Modal>
    </>
  );
}

export function EditarSocio({ socio }: { socio: SocioEditable }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}><Pencil className="size-4" /> Editar</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Editar socio">
        <FormularioAccion accion={guardarSocio} onExito={() => setAbierto(false)} textoBoton="Guardar cambios" mensajeExito="Socio actualizado.">
          <CamposSocio inicial={socio} />
        </FormularioAccion>
      </Modal>
    </>
  );
}

export function AporteRetiro({ socios, cajas }: { socios: { id: string; nombre: string }[]; cajas: { id: string; nombre: string }[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton onClick={() => setAbierto(true)} disabled={socios.length === 0}><HandCoins className="size-4" /> Aporte / retiro</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Aporte o retiro de socio">
        <FormularioAccion accion={registrarAporteRetiro} onExito={() => setAbierto(false)} textoBoton="Registrar" mensajeExito="Movimiento de capital registrado.">
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Tipo">
              <Select name="tipo" defaultValue="aporte">
                <option value="aporte">Aporte (entra dinero)</option>
                <option value="retiro">Retiro (sale dinero)</option>
              </Select>
            </Campo>
            <Campo etiqueta="Monto S/"><InputNumero name="monto" required /></Campo>
          </div>
          <Campo etiqueta="Socio"><Select name="socio_id" required>{socios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</Select></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Caja"><Select name="caja_id" required>{cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Campo>
            <Campo etiqueta="Fecha"><Input name="fecha" type="date" defaultValue={hoyLima()} max={hoyLima()} /></Campo>
          </div>
          <Campo etiqueta="Nota"><Input name="nota" placeholder="Ej.: capital inicial / reparto de utilidad" /></Campo>
        </FormularioAccion>
      </Modal>
    </>
  );
}

export function CerrarMes({ periodos }: { periodos: string[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}><Lock className="size-4" /> Cerrar mes</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Cerrar mes">
        <FormularioAccion accion={cerrarMes} onExito={() => setAbierto(false)} textoBoton="Cerrar periodo" mensajeExito="Periodo cerrado.">
          <Aviso>Se guarda una foto de la caja, el stock y el resultado del mes, y se bloquea editar movimientos de ese periodo. Gerencia puede reabrirlo indicando el motivo.</Aviso>
          <Campo etiqueta="Periodo">
            <Select name="periodo" required>{periodos.map((p) => <option key={p} value={p}>{nombrePeriodo(p)}</option>)}</Select>
          </Campo>
        </FormularioAccion>
      </Modal>
    </>
  );
}
