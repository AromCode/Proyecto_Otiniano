"use server";

import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import type { Resultado } from "@/lib/tipos";

export interface DatosVenta {
  clave: string;
  comprador_id: string;
  items: { metal_id: string; peso_salida_kg: string; peso_recibido_kg?: string; precio_kg?: string }[];
  guia_numero: string | null;
  guia_url: string | null;
  notas: string | null;
  /** Si viene caja y todas las líneas traen recibido+precio, se confirma en el acto */
  caja_id: string | null;
  /** Medio de cobro configurado (define el tipo y la caja por defecto) */
  medio_id: string | null;
  comprobante_url: string | null;
}

export async function registrarVenta(d: DatosVenta): Promise<Resultado<{ id: string; numero: number; estado: string }>> {
  const { supabase, empresa } = await obtenerContexto();
  const { data, error } = await supabase.rpc("registrar_venta", {
    p_empresa: empresa.id,
    p_comprador: d.comprador_id,
    p_items: d.items,
    p_guia_numero: d.guia_numero,
    p_guia_url: d.guia_url,
    p_notas: d.notas,
    p_clave: d.clave,
    p_caja: d.caja_id,
    p_comprobante_url: d.comprobante_url,
    p_medio: d.medio_id,
  });
  if (error) return fallo(error);
  return ok(data as { id: string; numero: number; estado: string });
}

export async function confirmarVenta(d: {
  venta_id: string;
  items: { item_id: string; peso_recibido_kg: string; precio_kg: string }[];
  caja_id: string;
  medio_id: string | null;
  comprobante_url: string | null;
}): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("confirmar_venta", {
    p_venta: d.venta_id,
    p_items: d.items,
    p_caja: d.caja_id,
    p_comprobante_url: d.comprobante_url,
    p_medio: d.medio_id,
  });
  if (error) return fallo(error);
  return ok(null);
}

export async function anularVenta(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("anular_venta", { p_venta: texto(fd, "id"), p_motivo: texto(fd, "motivo") });
  if (error) return fallo(error);
  return ok(null);
}

export async function actualizarGuia(d: {
  venta_id: string; guia_numero: string | null; guia_url: string | null; comprobante_url: string | null; notas: string | null;
}): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("actualizar_venta_guia", {
    p_venta: d.venta_id, p_guia_numero: d.guia_numero, p_guia_url: d.guia_url,
    p_comprobante_url: d.comprobante_url, p_notas: d.notas,
  });
  if (error) return fallo(error);
  return ok(null);
}
