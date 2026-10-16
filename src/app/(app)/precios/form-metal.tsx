"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Campo, Input, InputNumero } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Boton } from "@/components/ui/boton";
import type { Metal } from "@/lib/tipos";
import { cambiarEstadoMetal, guardarMetal } from "./acciones";

const COLORES = ["#c2621f", "#b8862e", "#9ca3af", "#57534e", "#0f766e", "#7c3aed", "#be123c", "#2563eb"];

export function FormMetal({ metal, onListo }: { metal: Metal | null; onListo: () => void }) {
  const router = useRouter();
  const [color, setColor] = useState(metal?.color ?? COLORES[0]);
  return (
    <div className="space-y-4">
      <FormularioAccion accion={guardarMetal} onExito={onListo} textoBoton={metal ? "Guardar cambios" : "Crear metal"}>
        {metal && <input type="hidden" name="id" value={metal.id} />}
        <input type="hidden" name="color" value={color} />
        <Campo etiqueta="Nombre" ayuda="Si hay variantes con precio distinto, cree un metal por variante (ej.: Cobre brillante, Cobre quemado).">
          <Input name="nombre" defaultValue={metal?.nombre ?? ""} required />
        </Campo>
        <div className="grid grid-cols-3 gap-3">
          <Campo etiqueta="Compra S/ kg"><InputNumero name="precio_compra" defaultValue={metal?.precio_compra ?? ""} /></Campo>
          <Campo etiqueta="Venta S/ kg"><InputNumero name="precio_venta" defaultValue={metal?.precio_venta ?? ""} /></Campo>
          <Campo etiqueta="Orden"><Input name="orden" type="number" defaultValue={metal?.orden ?? 0} /></Campo>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-stone-700">Color de etiqueta</span>
          <div className="flex flex-wrap gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-8 rounded-full ring-offset-2 ${color === c ? "ring-2 ring-stone-900" : ""}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
      </FormularioAccion>
      {metal && (
        <Boton
          variante="fantasma"
          className="w-full"
          onClick={async () => {
            await cambiarEstadoMetal(metal.id, !metal.activo);
            router.refresh();
            onListo();
          }}
        >
          {metal.activo ? "Desactivar metal" : "Activar metal"}
        </Boton>
      )}
    </div>
  );
}
