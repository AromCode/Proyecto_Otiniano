"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Modal } from "@/components/ui/modal";
import { FormProveedor } from "@/components/form-proveedor";
import type { Proveedor } from "@/lib/tipos";
import { actualizarProveedor, cambiarEstadoProveedor, crearProveedor } from "./acciones";
import { useRouter } from "next/navigation";

export function NuevoProveedor() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton onClick={() => setAbierto(true)}><Plus className="size-4" /> Nuevo proveedor</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo proveedor">
        <FormProveedor accion={crearProveedor} onExito={() => setAbierto(false)} />
      </Modal>
    </>
  );
}

export function EditarProveedor({ proveedor, puedeDesactivar }: { proveedor: Proveedor & { notas?: string | null }; puedeDesactivar: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}><Pencil className="size-4" /> Editar</Boton>
      {puedeDesactivar && (
        <Boton
          variante="fantasma"
          onClick={async () => { await cambiarEstadoProveedor(proveedor.id, !proveedor.activo); router.refresh(); }}
        >
          {proveedor.activo ? "Desactivar" : "Activar"}
        </Boton>
      )}
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Editar proveedor">
        <FormProveedor accion={actualizarProveedor} inicial={proveedor} onExito={() => setAbierto(false)} textoBoton="Guardar cambios" />
      </Modal>
    </>
  );
}
