"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Campo, Input, InputNumero, Select } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Boton } from "@/components/ui/boton";
import type { Producto } from "@/lib/tipos";
import { cambiarEstadoMetal, guardarMetal } from "./acciones";

const COLORES = ["#c2621f", "#b8862e", "#9ca3af", "#57534e", "#0f766e", "#7c3aed", "#be123c", "#2563eb"];

/** Alta/edición de un producto en cualquier nivel de la jerarquía */
export function FormMetal({ producto, padreId, productos, onListo }: {
  producto: Producto | null;
  padreId: string | null;
  productos: Producto[];
  onListo: () => void;
}) {
  const router = useRouter();
  const padre = productos.find((p) => p.id === padreId) ?? null;
  const [color, setColor] = useState(producto?.color ?? padre?.color ?? COLORES[0]);
  // Un producto no puede ir dentro de sí mismo ni de sus variantes
  const prohibidos = new Set(producto ? productos.filter((p) => p.ruta === producto.ruta || p.ruta.startsWith(`${producto.ruta} › `)).map((p) => p.id) : []);
  const base = producto ?? padre;

  return (
    <div className="space-y-4">
      <FormularioAccion accion={guardarMetal} mensajeExito={producto ? "Producto actualizado." : "Producto creado."} onExito={onListo}
        textoBoton={producto ? "Guardar cambios" : "Crear producto"}>
        {producto && <input type="hidden" name="id" value={producto.id} />}
        <input type="hidden" name="color" value={color} />
        <Campo etiqueta="Dentro de" ayuda="Vacío = familia (primer nivel). Una variante puede tener sus propias variantes.">
          <Select name="padre_id" defaultValue={padreId ?? ""}>
            <option value="">— Familia (primer nivel) —</option>
            {productos.filter((p) => !prohibidos.has(p.id)).map((p) => (
              <option key={p.id} value={p.id}>{"  ".repeat(p.nivel - 1)}{p.nivel > 1 ? "└ " : ""}{p.nombre}</option>
            ))}
          </Select>
        </Campo>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Campo etiqueta="Nombre"><Input name="nombre" defaultValue={producto?.nombre ?? ""} required placeholder={padre ? `Ej.: ${padre.nombre} limpio` : "Ej.: Cobre"} /></Campo>
          <Campo etiqueta="Código"><Input name="codigo" defaultValue={producto?.codigo ?? ""} placeholder="CU-01" className="uppercase" /></Campo>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Campo etiqueta="Compra S/ kg"><InputNumero name="precio_compra" defaultValue={base?.precio_compra ?? ""} /></Campo>
          <Campo etiqueta="Mayorista S/ kg"><InputNumero name="precio_mayorista" defaultValue={base?.precio_mayorista ?? ""} placeholder="= compra" /></Campo>
          <Campo etiqueta="Venta S/ kg"><InputNumero name="precio_venta" defaultValue={base?.precio_venta ?? ""} /></Campo>
          <Campo etiqueta="Orden"><Input name="orden" type="number" defaultValue={producto?.orden ?? 0} /></Campo>
        </div>
        <p className="-mt-1 text-xs text-stone-500">Al mayorista se le paga su propio precio (no es un % automático). Vacío = el mismo que el minorista.</p>
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
      {producto && (
        <Boton
          variante="fantasma"
          className="w-full"
          onClick={async () => {
            await cambiarEstadoMetal(producto.id, !producto.activo);
            router.refresh();
            onListo();
          }}
        >
          {producto.activo ? "Desactivar producto" : "Activar producto"}
        </Boton>
      )}
    </div>
  );
}
