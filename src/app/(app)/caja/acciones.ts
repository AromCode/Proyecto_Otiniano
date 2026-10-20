"use server";

import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import { normalizar } from "@/lib/montos";
import type { Resultado } from "@/lib/tipos";

function monto(fd: FormData, campo = "monto") {
  return normalizar(texto(fd, campo) ?? "");
}

export async function registrarGasto(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const m = monto(fd);
  if (!m) return fallo("Ingrese el monto.");
  const { error } = await supabase.rpc("registrar_gasto", {
    p_empresa: empresa.id, p_caja: texto(fd, "caja_id"), p_monto: m, p_concepto: texto(fd, "concepto"),
    p_categoria: texto(fd, "categoria_id"), p_comprobante_url: texto(fd, "comprobante_url"),
  });
  if (error) return fallo(error);
  return ok(null);
}

export async function anularGasto(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("anular_gasto", { p_gasto: texto(fd, "id"), p_motivo: texto(fd, "motivo") });
  if (error) return fallo(error);
  return ok(null);
}

export async function registrarTraspaso(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const m = monto(fd);
  if (!m) return fallo("Ingrese el monto.");
  const { error } = await supabase.rpc("registrar_traspaso", {
    p_empresa: empresa.id, p_origen: texto(fd, "origen"), p_destino: texto(fd, "destino"),
    p_monto: m, p_concepto: texto(fd, "concepto"),
  });
  if (error) return fallo(error);
  return ok(null);
}

export async function anularTraspaso(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("anular_traspaso", { p_traspaso: texto(fd, "id"), p_motivo: texto(fd, "motivo") });
  if (error) return fallo(error);
  return ok(null);
}

export async function registrarArqueo(_: unknown, fd: FormData): Promise<Resultado<{ diferencia: number; saldo_sistema: number }>> {
  const { supabase, empresa } = await obtenerContexto();
  const m = monto(fd, "contado");
  if (!m) return fallo("Ingrese el efectivo contado.");
  const { data, error } = await supabase.rpc("registrar_arqueo", {
    p_empresa: empresa.id, p_caja: texto(fd, "caja_id"), p_contado: m, p_nota: texto(fd, "nota"),
    p_ajustar: fd.get("ajustar") === "on",
  });
  if (error) return fallo(error);
  return ok(data as { diferencia: number; saldo_sistema: number });
}
