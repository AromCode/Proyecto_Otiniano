"use server";

import { revalidatePath } from "next/cache";
import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import { normalizar } from "@/lib/montos";
import type { Resultado } from "@/lib/tipos";

export interface DatosSeleccion {
  compra_id: string;
  /** Solo las líneas con descuento; vacío = todo conforme */
  items: { compra_item_id: string; kg: string }[];
  motivo: string | null;
  cobrar: boolean;
}

export async function registrarSeleccion(d: DatosSeleccion): Promise<Resultado<{ numero: number; kg: number; importe: number; cobrar: boolean }>> {
  const { supabase } = await obtenerContexto();
  const items = d.items.map((i) => ({ compra_item_id: i.compra_item_id, kg: normalizar(i.kg) })).filter((i) => Number(i.kg) > 0);
  const { data, error } = await supabase.rpc("registrar_seleccion", {
    p_compra: d.compra_id, p_items: items, p_motivo: d.motivo, p_cobrar: d.cobrar,
  });
  if (error) return fallo(error);
  revalidatePath("/", "layout");
  return ok(data as { numero: number; kg: number; importe: number; cobrar: boolean });
}

export async function anularSeleccion(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("anular_seleccion", { p_seleccion: texto(fd, "id")!, p_motivo: texto(fd, "motivo")! });
  if (error) return fallo(error);
  revalidatePath("/", "layout");
  return ok(null);
}

export async function registrarDevolucion(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const monto = normalizar(texto(fd, "monto") ?? "");
  if (!monto || Number(monto) <= 0) return fallo("Ingrese el monto devuelto.");
  const { error } = await supabase.rpc("registrar_devolucion_proveedor", {
    p_empresa: empresa.id, p_proveedor: texto(fd, "proveedor_id")!, p_monto: Number(monto),
    p_caja: texto(fd, "caja_id")!, p_nota: texto(fd, "nota") ?? undefined,
  });
  if (error) return fallo(error);
  revalidatePath("/", "layout");
  return ok(null);
}

export async function anularDevolucion(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("anular_devolucion_proveedor", { p_id: texto(fd, "id")!, p_motivo: texto(fd, "motivo")! });
  if (error) return fallo(error);
  revalidatePath("/", "layout");
  return ok(null);
}
