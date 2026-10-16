import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Resultado } from "./tipos";

/** Traduce errores de Postgres/Supabase a mensajes para el usuario. */
export function mensajeError(e: PostgrestError | Error | null | undefined): string {
  if (!e) return "Error desconocido.";
  const pe = e as PostgrestError;
  if (pe.code === "23505") return "Ya existe un registro con esos datos (documento o nombre repetido).";
  if (pe.code === "42501") return pe.message?.includes("permiso") || pe.message?.includes("pertenece")
    ? pe.message : "No tiene permiso para esta operación.";
  if (pe.code === "23514") return "Algún dato no es válido. Revise el formulario.";
  return e.message || "Error desconocido.";
}

export function ok<T>(data: T): Resultado<T> {
  return { ok: true, data };
}
export function fallo(e: PostgrestError | Error | string | null | undefined): Resultado<never> {
  return { ok: false, error: typeof e === "string" ? e : mensajeError(e) };
}

/** Lee un campo de texto del FormData (vacío → null) */
export function texto(fd: FormData, campo: string): string | null {
  const v = fd.get(campo);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
