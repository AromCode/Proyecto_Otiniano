"use client";

import { useState } from "react";
import { HandCoins, Lock, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, InputNumero, Select } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Aviso } from "@/components/ui/basicos";
import { hoyLima, nombrePeriodo } from "@/lib/formato";
import { cerrarMes, guardarSocio, registrarAporteRetiro } from "./acciones";

export function NuevoSocio() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}><Plus className="size-4" /> Socio</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo socio">
        <FormularioAccion accion={guardarSocio} onExito={() => setAbierto(false)} textoBoton="Crear socio">
          <Campo etiqueta="Nombre"><Input name="nombre" required /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="DNI"><Input name="dni" inputMode="numeric" maxLength={8} /></Campo>
            <Campo etiqueta="Participación %" ayuda="Para repartir la utilidad"><InputNumero name="porcentaje" required /></Campo>
          </div>
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
        <FormularioAccion accion={registrarAporteRetiro} onExito={() => setAbierto(false)} textoBoton="Registrar">
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
        <FormularioAccion accion={cerrarMes} onExito={() => setAbierto(false)} textoBoton="Cerrar periodo">
          <Aviso>Se guarda una foto de la caja, el stock y el resultado del mes, y se bloquea editar movimientos de ese periodo. El dueño puede reabrirlo indicando el motivo.</Aviso>
          <Campo etiqueta="Periodo">
            <Select name="periodo" required>{periodos.map((p) => <option key={p} value={p}>{nombrePeriodo(p)}</option>)}</Select>
          </Campo>
        </FormularioAccion>
      </Modal>
    </>
  );
}
