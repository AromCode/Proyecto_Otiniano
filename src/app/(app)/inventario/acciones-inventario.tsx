"use client";

import { useState } from "react";
import { ArrowLeftRight, ClipboardCheck, MinusCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { Campo, InputNumero, Select, Textarea } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { useNotificar } from "@/components/ui/notificaciones";
import { kg } from "@/lib/formato";
import { reclasificar, registrarAjuste, registrarConteo } from "./acciones";

type M = { id: string; nombre: string; kg: string };

export function AccionesInventario({ metales }: { metales: M[] }) {
  const [abierto, setAbierto] = useState<"conteo" | "ajuste" | "reclasificar" | null>(null);
  const notificar = useNotificar();
  const cerrar = () => setAbierto(null);
  const opciones = metales.map((m) => <option key={m.id} value={m.id}>{m.nombre} · {kg(m.kg)}</option>);

  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto("conteo")}><ClipboardCheck className="size-4" /> Conteo físico</Boton>
      <Boton variante="secundario" onClick={() => setAbierto("ajuste")}><MinusCircle className="size-4" /> Ajuste / merma</Boton>
      <Boton variante="secundario" onClick={() => setAbierto("reclasificar")}><ArrowLeftRight className="size-4" /> Reclasificar</Boton>

      <Modal abierto={abierto === "conteo"} onCerrar={cerrar} titulo="Conteo físico">
        <FormularioAccion accion={registrarConteo} textoBoton="Registrar conteo" mensajeExito={false} onExito={(m) => { notificar({ titulo: "Conteo registrado", mensaje: String(m) }); cerrar(); }}>
          <p className="text-sm text-stone-600">Pese lo que hay en el almacén. El sistema ajusta la diferencia y la registra como merma o sobrante.</p>
          <Campo etiqueta="Metal"><Select name="metal_id" required>{opciones}</Select></Campo>
          <Campo etiqueta="Kilos contados"><InputNumero name="kg" required /></Campo>
          <Campo etiqueta="Observación (opcional)"><Textarea name="motivo" /></Campo>
        </FormularioAccion>
      </Modal>

      <Modal abierto={abierto === "ajuste"} onCerrar={cerrar} titulo="Ajuste de inventario">
        <FormularioAccion accion={registrarAjuste} textoBoton="Registrar ajuste" mensajeExito="Ajuste registrado." onExito={cerrar}>
          <Campo etiqueta="Metal"><Select name="metal_id" required>{opciones}</Select></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Sentido">
              <Select name="sentido" defaultValue="restar">
                <option value="restar">Restar (merma / faltante)</option>
                <option value="sumar">Sumar (sobrante)</option>
              </Select>
            </Campo>
            <Campo etiqueta="Kilos"><InputNumero name="kg" required /></Campo>
          </div>
          <Campo etiqueta="Tipo">
            <Select name="tipo" defaultValue="merma">
              <option value="merma">Merma</option>
              <option value="otro">Otro</option>
            </Select>
          </Campo>
          <Campo etiqueta="Motivo"><Textarea name="motivo" required placeholder="Ej.: humedad, limpieza del material" /></Campo>
        </FormularioAccion>
      </Modal>

      <Modal abierto={abierto === "reclasificar"} onCerrar={cerrar} titulo="Reclasificar metal">
        <FormularioAccion accion={reclasificar} textoBoton="Reclasificar" mensajeExito="Reclasificación registrada." onExito={cerrar}>
          <p className="text-sm text-stone-600">Mueve kilos de un metal a otro llevando su costo (ej.: cobre quemado → cobre brillante).</p>
          <Campo etiqueta="Desde"><Select name="origen" required>{opciones}</Select></Campo>
          <Campo etiqueta="Hacia"><Select name="destino" required>{opciones}</Select></Campo>
          <Campo etiqueta="Kilos"><InputNumero name="kg" required /></Campo>
          <Campo etiqueta="Motivo"><Textarea name="motivo" required /></Campo>
        </FormularioAccion>
      </Modal>
    </>
  );
}
