import "server-only";
import type { Contexto } from "./contexto";
import type { MedioPagoConf, Producto } from "./tipos";

/** Productos de la empresa en el orden del árbol (familia → producto → variante…) */
export async function cargarProductos(ctx: Pick<Contexto, "supabase" | "empresa">, soloActivos = true): Promise<Producto[]> {
  let q = ctx.supabase.from("v_productos")
    .select("id, padre_id, codigo, nombre, color, orden, unidad, activo, precio_compra, precio_mayorista, precio_venta, nivel, ruta, clave_orden, tiene_hijos")
    .eq("empresa_id", ctx.empresa.id);
  if (soloActivos) q = q.eq("activo", true);
  const { data } = await q.order("clave_orden");
  return (data ?? []) as Producto[];
}

export async function cargarMediosPago(ctx: Pick<Contexto, "supabase" | "empresa">, soloActivos = true): Promise<MedioPagoConf[]> {
  let q = ctx.supabase.from("medios_pago").select("id, nombre, tipo, caja_id, orden, activo").eq("empresa_id", ctx.empresa.id);
  if (soloActivos) q = q.eq("activo", true);
  const { data } = await q.order("orden").order("nombre");
  return (data ?? []) as MedioPagoConf[];
}
