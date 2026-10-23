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

type Membresia = { rol: Rol; nombre: string | null; empresa: Empresa };

/**
 * Membresías por usuario en memoria del servidor por unos segundos: así cambiar de sección no
 * espera una consulta extra a Supabase. Solo afecta a la UI (menú, permisos visibles); la RLS
 * sigue validando cada lectura y escritura. Se limpia al cambiar empresa, roles o miembros.
 */
const MEMBRESIAS_TTL_MS = 30_000;
const membresias = new Map<string, { lista: Membresia[]; vence: number }>();

export function olvidarMembresias() {
  membresias.clear();
}

/** Usuario + empresa activa + rol. Redirige a /login o /sin-empresa si corresponde. */
export const obtenerContexto = cache(async (): Promise<Contexto> => {
  const supabase = await crearClienteServidor();
  // JWT verificado localmente (el middleware ya refrescó la sesión): sin viaje a Supabase Auth
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const user = { id: claims.sub, email: (claims.email as string | undefined) ?? "" };

  let lista = membresias.get(user.id);
  if (!lista || lista.vence < Date.now()) {
    const { data: filas } = await supabase
      .from("miembros")
      .select("rol, nombre, empresa:empresas(id, razon_social, ruc, direccion, telefono, logo_url, monto_doc_obligatorio, roles_editan_precio, dias_seleccion, merma_alerta_pct)")
      .eq("user_id", user.id)
      .eq("activo", true);
    lista = {
      lista: (filas ?? [])
        .filter((m) => m.empresa)
        .map((m) => ({ rol: m.rol as Rol, nombre: m.nombre as string | null, empresa: m.empresa as unknown as Empresa })),
      vence: Date.now() + MEMBRESIAS_TTL_MS,
    };
    if (lista.lista.length > 0) membresias.set(user.id, lista);
  }
  const { lista: miembros } = lista;
  if (miembros.length === 0) redirect("/sin-empresa");

  const elegida = (await cookies()).get(COOKIE_EMPRESA)?.value;
  const actual = miembros.find((m) => m.empresa.id === elegida) ?? miembros[0];

  return {
    supabase,
    userId: user.id,
    email: user.email,
    nombre: actual.nombre ?? user.email?.split("@")[0] ?? "",
    empresa: actual.empresa,
    rol: actual.rol,
    empresas: miembros.map((m) => ({ id: m.empresa.id, razon_social: m.empresa.razon_social, rol: m.rol })),
  };
});

/** Igual que obtenerContexto, pero corta con /sin-permiso si el rol no puede ninguna de las acciones. */
export async function exigir(...acciones: Accion[]): Promise<Contexto> {
  const ctx = await obtenerContexto();
  if (!acciones.some((a) => puede(ctx.rol, a))) redirect("/sin-permiso");
  return ctx;
}
