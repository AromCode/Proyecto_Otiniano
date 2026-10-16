import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "./supabase/server";
import { puede, type Accion } from "./permisos";
import type { Empresa, Rol } from "./tipos";

export const COOKIE_EMPRESA = "empresa_activa";

export interface Contexto {
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>;
  userId: string;
  email: string;
  nombre: string;
  empresa: Empresa;
  rol: Rol;
  empresas: { id: string; razon_social: string; rol: Rol }[];
}

/** Usuario + empresa activa + rol. Redirige a /login o /sin-empresa si corresponde. */
export const obtenerContexto = cache(async (): Promise<Contexto> => {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membresias } = await supabase
    .from("miembros")
    .select("rol, nombre, empresa:empresas(id, razon_social, ruc, direccion, telefono, logo_url, monto_doc_obligatorio, roles_editan_precio)")
    .eq("user_id", user.id)
    .eq("activo", true);

  const lista = (membresias ?? [])
    .filter((m) => m.empresa)
    .map((m) => ({ rol: m.rol as Rol, nombre: m.nombre as string | null, empresa: m.empresa as unknown as Empresa }));
  if (lista.length === 0) redirect("/sin-empresa");

  const elegida = (await cookies()).get(COOKIE_EMPRESA)?.value;
  const actual = lista.find((m) => m.empresa.id === elegida) ?? lista[0];

  return {
    supabase,
    userId: user.id,
    email: user.email ?? "",
    nombre: actual.nombre ?? user.email?.split("@")[0] ?? "",
    empresa: actual.empresa,
    rol: actual.rol,
    empresas: lista.map((m) => ({ id: m.empresa.id, razon_social: m.empresa.razon_social, rol: m.rol })),
  };
});

/** Igual que obtenerContexto, pero corta con /sin-permiso si el rol no puede ninguna de las acciones. */
export async function exigir(...acciones: Accion[]): Promise<Contexto> {
  const ctx = await obtenerContexto();
  if (!acciones.some((a) => puede(ctx.rol, a))) redirect("/sin-permiso");
  return ctx;
}
