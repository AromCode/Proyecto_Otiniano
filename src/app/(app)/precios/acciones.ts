"use server";

import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import { normalizar } from "@/lib/montos";
import type { Resultado } from "@/lib/tipos";

/** Guarda solo los precios que cambiaron. El trigger de la BD deja el histórico. */
export async function guardarPrecios(cambios: { id: string; precio_compra: string; precio_venta: string }[]): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  for (const c of cambios) {
    const pc = normalizar(c.precio_compra);
    const pv = normalizar(c.precio_venta);
    if (!pc || !pv) return fallo("Los precios deben ser números válidos.");
    const { error, count } = await supabase
      .from("metales")
      .update({ precio_compra: pc, precio_venta: pv }, { count: "exact" })
      .eq("id", c.id);
    if (error) return fallo(error);
    if (!count) return fallo("Solo el dueño puede cambiar los precios del día.");
  }
  return ok(null);
}

export async function guardarMetal(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const id = texto(fd, "id");
  const datos = {
    nombre: texto(fd, "nombre"),
    color: texto(fd, "color"),
    orden: Number(texto(fd, "orden") ?? 0) || 0,
    precio_compra: normalizar(texto(fd, "precio_compra") ?? "0") || "0",
    precio_venta: normalizar(texto(fd, "precio_venta") ?? "0") || "0",
  };
  if (!datos.nombre) return fallo("Ingrese el nombre del metal.");
  const { error } = id
    ? await supabase.from("metales").update(datos).eq("id", id)
    : await supabase.from("metales").insert({ ...datos, empresa_id: empresa.id });
  if (error) return fallo(error);
  return ok(null);
}

export async function cambiarEstadoMetal(id: string, activo: boolean): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.from("metales").update({ activo }).eq("id", id);
  if (error) return fallo(error);
  return ok(null);
}
