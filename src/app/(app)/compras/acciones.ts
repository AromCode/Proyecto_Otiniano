"use server";

import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import type { MedioPago, Resultado } from "@/lib/tipos";

export interface LineaCompra {
  metal_id: string;
  peso_bruto_kg: string;
  precio_kg: string;
}

export interface DatosCompra {
  clave: string;
  proveedor_id: string | null;
  caja_id: string;
  medio_pago: MedioPago;
  items: LineaCompra[];
  notas: string | null;
  foto_ticket_url: string | null;
  /** Descontar del pago el saldo a favor del proveedor (descuentos de selección) */
  aplicar_saldo: boolean;
}

export type CompraRegistrada = { id: string; numero: number; total: number; saldo_aplicado: number };

export async function registrarCompra(d: DatosCompra): Promise<Resultado<CompraRegistrada>> {
  const { supabase, empresa } = await obtenerContexto();
  const { data, error } = await supabase.rpc("registrar_compra", {
    p_empresa: empresa.id,
    p_items: d.items,
    p_caja: d.caja_id,
    p_medio_pago: d.medio_pago,
    p_proveedor: d.proveedor_id,
    p_notas: d.notas,
    p_foto_ticket_url: d.foto_ticket_url,
    p_clave: d.clave,
    p_aplicar_saldo: d.aplicar_saldo,
  });
  if (error) return fallo(error);
  return ok(data as CompraRegistrada);
}

/** Saldo a favor del proveedor (lo que nos debe por descuentos de selección) */
export async function saldoAFavor(proveedorId: string): Promise<number> {
  const { supabase } = await obtenerContexto();
  const { data } = await supabase.from("v_saldo_proveedor").select("saldo").eq("proveedor_id", proveedorId).maybeSingle();
  return Number(data?.saldo ?? 0);
}

export async function anularCompra(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("anular_compra", {
    p_compra: texto(fd, "id"),
    p_motivo: texto(fd, "motivo"),
  });
  if (error) return fallo(error);
  return ok(null);
}

export async function actualizarAdjuntosCompra(id: string, foto: string | null, notas: string | null): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("actualizar_compra_adjuntos", {
    p_compra: id, p_foto_ticket_url: foto, p_notas: notas,
  });
  if (error) return fallo(error);
  return ok(null);
}
