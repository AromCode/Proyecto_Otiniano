"use server";

import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import { normalizar } from "@/lib/montos";
import type { Resultado } from "@/lib/tipos";

export async function registrarConteo(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const kg = normalizar(texto(fd, "kg") ?? "");
  if (!kg) return fallo("Ingrese los kilos contados.");
  const { data, error } = await supabase.rpc("registrar_conteo", {
    p_empresa: empresa.id, p_metal: texto(fd, "metal_id"), p_kg_contado: kg, p_motivo: texto(fd, "motivo"),
  });
  if (error) return fallo(error);
  return ok(data ? "Ajuste registrado." : "El conteo coincide con el sistema: no hubo ajuste.");
}

export async function registrarAjuste(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const kg = normalizar(texto(fd, "kg") ?? "");
  if (!kg || Number(kg) === 0) return fallo("Ingrese los kilos.");
  const signo = texto(fd, "sentido") === "sumar" ? "" : "-";
  const { error } = await supabase.rpc("registrar_ajuste", {
    p_empresa: empresa.id, p_metal: texto(fd, "metal_id"), p_kg: `${signo}${kg}`,
    p_motivo: texto(fd, "motivo"), p_tipo: texto(fd, "tipo") ?? "merma",
  });
  if (error) return fallo(error);
  return ok(null);
}

export async function reclasificar(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const kg = normalizar(texto(fd, "kg") ?? "");
  if (!kg) return fallo("Ingrese los kilos.");
  const { error } = await supabase.rpc("reclasificar_metal", {
    p_empresa: empresa.id, p_origen: texto(fd, "origen"), p_destino: texto(fd, "destino"),
    p_kg: kg, p_motivo: texto(fd, "motivo"),
  });
  if (error) return fallo(error);
  return ok(null);
}
