"use server";

import { revalidatePath } from "next/cache";
import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import type { Resultado } from "@/lib/tipos";

export async function guardarComprador(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase, empresa } = await obtenerContexto();
  const id = texto(fd, "id");
  const datos = {
    ruc: texto(fd, "ruc"),
    razon_social: texto(fd, "razon_social"),
    direccion: texto(fd, "direccion"),
    telefono: texto(fd, "telefono"),
    contacto: texto(fd, "contacto"),
  };
  if (!datos.razon_social) return fallo("Ingrese la razón social.");
  if (datos.ruc && !/^\d{11}$/.test(datos.ruc)) return fallo("El RUC debe tener 11 dígitos.");
  const { error, count } = id
    ? await supabase.from("compradores").update(datos, { count: "exact" }).eq("id", id)
    : await supabase.from("compradores").insert({ ...datos, empresa_id: empresa.id }, { count: "exact" });
  if (error) return fallo(error);
  if (!count) return fallo("No tiene permiso para esta operación.");
  revalidatePath("/compradores", "layout");
  return ok(null);
}

export async function cambiarEstadoComprador(id: string, activo: boolean): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.from("compradores").update({ activo }).eq("id", id);
  if (error) return fallo(error);
  revalidatePath("/compradores", "layout");
  return ok(null);
}
