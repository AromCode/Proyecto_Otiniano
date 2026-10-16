"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { Campo, Textarea } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Aviso } from "@/components/ui/basicos";
import type { Resultado } from "@/lib/tipos";

/** Anulación con motivo obligatorio. Nada se borra: queda quién, cuándo y por qué. */
export function BotonAnular({
  id, accion, titulo, explicacion, etiqueta = "Anular", textoConfirmar = "Confirmar anulación",
}: {
  id: string;
  accion: (prev: Resultado | null, fd: FormData) => Promise<Resultado>;
  titulo: string;
  explicacion?: string;
  etiqueta?: string;
  textoConfirmar?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)} className="text-red-700">
        <Ban className="size-4" /> {etiqueta}
      </Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo={titulo}>
        <FormularioAccion accion={accion} textoBoton={textoConfirmar} variante="peligro" onExito={() => setAbierto(false)}>
          <input type="hidden" name="id" value={id} />
          {explicacion && <Aviso>{explicacion}</Aviso>}
          <Campo etiqueta="Motivo">
            <Textarea name="motivo" required minLength={3} placeholder="Ej.: error al digitar el peso" />
          </Campo>
        </FormularioAccion>
      </Modal>
    </>
  );
}
