"use server";

import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import { normalizar } from "@/lib/montos";
import type { Resultado } from "@/lib/tipos";

export async function guardarSocio(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const id = texto(fd, "id");
  const datos = {
    nombre: texto(fd, "nombre"),
    dni: texto(fd, "dni"),
    porcentaje: normalizar(texto(fd, "porcentaje") ?? "0") || "0",
    activo: fd.get("activo") !== "off",
  };
  if (!datos.nombre) return fallo("Ingrese el nombre del socio.");
  if (datos.dni && !/^\d{8}$/.test(datos.dni)) return fallo("El DNI debe tener 8 dígitos.");
  if (Number(datos.porcentaje) > 100) return fallo("El porcentaje no puede pasar de 100.");
  const { error, count } = id
    ? await supabase.from("socios").update(datos, { count: "exact" }).eq("id", id)
    : await supabase.from("socios").insert({ ...datos, empresa_id: empresa.id }, { count: "exact" });
  if (error) return fallo(error);
  if (!count) return fallo("Solo el dueño puede gestionar socios.");
  return ok(null);
}

export async function registrarAporteRetiro(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const monto = normalizar(texto(fd, "monto") ?? "");
  if (!monto) return fallo("Ingrese el monto.");
  const { error } = await supabase.rpc("registrar_aporte_retiro", {
    p_empresa: empresa.id, p_socio: texto(fd, "socio_id"), p_tipo: texto(fd, "tipo"),
    p_monto: monto, p_caja: texto(fd, "caja_id"), p_nota: texto(fd, "nota"),
    p_fecha: texto(fd, "fecha") ? `${texto(fd, "fecha")}T12:00:00-05:00` : null,
  });
  if (error) return fallo(error);
  return ok(null);
}

export async function anularAporteRetiro(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.rpc("anular_aporte_retiro", { p_id: texto(fd, "id"), p_motivo: texto(fd, "motivo") });
  if (error) return fallo(error);
  return ok(null);
}

export async function cerrarMes(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const { error } = await supabase.rpc("cerrar_mes", { p_empresa: empresa.id, p_periodo: texto(fd, "periodo") });
  if (error) return fallo(error);
  return ok(null);
}

export async function reabrirMes(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const { error } = await supabase.rpc("reabrir_mes", {
    p_empresa: empresa.id, p_periodo: texto(fd, "id"), p_motivo: texto(fd, "motivo"),
  });
  if (error) return fallo(error);
  return ok(null);
}
