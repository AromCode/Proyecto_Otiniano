"use server";

import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import { normalizar } from "@/lib/montos";
import type { Resultado } from "@/lib/tipos";

/** Guarda solo los precios que cambiaron. El trigger de la BD deja el histórico. */
export async function guardarPrecios(cambios: { id: string; precio_compra: string; precio_mayorista: string; precio_venta: string }[]): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  for (const c of cambios) {
    const pc = normalizar(c.precio_compra);
    const pv = normalizar(c.precio_venta);
    const pm = c.precio_mayorista.trim() ? normalizar(c.precio_mayorista) : null;
    if (!pc || !pv || pm === "") return fallo("Los precios deben ser números válidos.");
    const { error, count } = await supabase
      .from("metales")
      .update({ precio_compra: pc, precio_venta: pv, precio_mayorista: pm }, { count: "exact" })
      .eq("id", c.id);
    if (error) return fallo(error);
    if (!count) return fallo("Solo Gerencia o Administración pueden cambiar los precios del día.");
  }
  return ok(null);
}

export async function guardarMetal(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const id = texto(fd, "id");
  const mayorista = texto(fd, "precio_mayorista");
  const datos = {
    nombre: texto(fd, "nombre"),
    codigo: texto(fd, "codigo"),
    padre_id: texto(fd, "padre_id"),
    color: texto(fd, "color"),
    orden: Number(texto(fd, "orden") ?? 0) || 0,
    precio_compra: normalizar(texto(fd, "precio_compra") ?? "0") || "0",
    precio_mayorista: mayorista ? normalizar(mayorista) || null : null,
    precio_venta: normalizar(texto(fd, "precio_venta") ?? "0") || "0",
  };
  if (!datos.nombre) return fallo("Ingrese el nombre del producto.");
  if (id && datos.padre_id === id) return fallo("Un producto no puede estar dentro de sí mismo.");
  const { error } = id
    ? await supabase.from("metales").update(datos).eq("id", id)
    : await supabase.from("metales").insert({ ...datos, empresa_id: empresa.id });
  if (error) {
    if (/metales_nombre_uq/.test(error.message)) return fallo("Ya existe un producto con ese nombre en el mismo nivel.");
    if (/metales_codigo_uq/.test(error.message)) return fallo("Ese código ya lo usa otro producto.");
    return fallo(error);
  }
  return ok(null);
}

export async function cambiarEstadoMetal(id: string, activo: boolean): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.from("metales").update({ activo }).eq("id", id);
  if (error) return fallo(error);
  return ok(null);
}
