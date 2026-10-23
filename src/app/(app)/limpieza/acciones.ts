"use server";

import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import { normalizar } from "@/lib/montos";
import type { Resultado } from "@/lib/tipos";

export interface LineaLimpieza {
  compra_item_id: string;
  /** Peso al volver a pesar lo que queda del producto; vacío = sin merma */
  kg_limpio: string;
  /** Material de otra clase que salió y pasa al stock de otro producto */
  traslados: { metal_id: string; kg: string }[];
}

export type LimpiezaRegistrada = { numero: number; kg_merma: number; importe_merma: number; kg_traslado: number; pct_merma: number | null };

export async function registrarLimpieza(d: { compra_id: string; lineas: LineaLimpieza[]; motivo: string | null }): Promise<Resultado<LimpiezaRegistrada>> {
  const { supabase } = await obtenerContexto();
  const lineas = d.lineas
    .map((l) => ({
      compra_item_id: l.compra_item_id,
      kg_limpio: normalizar(l.kg_limpio) || null,
      traslados: l.traslados.map((t) => ({ metal_id: t.metal_id, kg: normalizar(t.kg) })).filter((t) => t.metal_id && Number(t.kg) > 0),
    }))
    .filter((l) => l.kg_limpio !== null || l.traslados.length > 0);
  const { data, error } = await supabase.rpc("registrar_limpieza", { p_compra: d.compra_id, p_lineas: lineas, p_motivo: d.motivo });
  if (error) return fallo(error);
  return ok(data as LimpiezaRegistrada);
}

export async function anularSeleccion(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("anular_seleccion", { p_seleccion: texto(fd, "id")!, p_motivo: texto(fd, "motivo")! });
  if (error) return fallo(error);
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
  return ok(null);
}

export async function anularDevolucion(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("anular_devolucion_proveedor", { p_id: texto(fd, "id")!, p_motivo: texto(fd, "motivo")! });
  if (error) return fallo(error);
  return ok(null);
}
