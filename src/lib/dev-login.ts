import { crearClienteAdmin } from "@/lib/supabase/admin";
import { ACCESOS, LISTA_ACCESOS, type Acceso } from "@/lib/accesos";

// Acceso directo SOLO EN DESARROLLO. DEV_LOGIN_EMAIL es el usuario principal; DEV_LOGIN_EMAILS (opcional,
// separados por coma) agrega usuarios de prueba para revisar otros roles (cajero, balancero…).
export function correosDev(): string[] {
  if (process.env.NODE_ENV !== "development") return [];
  return [process.env.DEV_LOGIN_EMAIL, ...(process.env.DEV_LOGIN_EMAILS ?? "").split(",")]
    .map((e) => e?.trim().toLowerCase()).filter((e): e is string => !!e);
}

/** El acceso directo solo se ofrece abriendo el sistema en la misma máquina (no desde el wifi del local) */
export function esHostLocal(host: string | null | undefined): boolean {
  const nombre = (host ?? "").replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  return ["localhost", "127.0.0.1", "::1"].includes(nombre);
}

/**
 * Un usuario de prueba por acceso (Gerencia, Administración, Almacén) para el «Ingreso directo por rol» del login.
 * Se buscan en la empresa demo (DEV_LOGIN_EMPRESA) prefiriendo correos que empiecen con el acceso
 * (gerencia.demo@…, almacen.demo@…) y luego los de DEV_LOGIN_EMAIL(S).
 */
export async function usuariosDev(): Promise<Partial<Record<Acceso, string>>> {
  if (process.env.NODE_ENV !== "development") return {};
  const admin = crearClienteAdmin();
  const { data: emp } = await admin.from("empresas").select("id")
    .ilike("razon_social", `%${process.env.DEV_LOGIN_EMPRESA ?? "Demo"}%`).limit(1).maybeSingle();
  // Sin empresa demo no se ofrece nadie: nunca tomar usuarios reales de otras empresas
  if (!emp) return {};
  const { data } = await admin.from("miembros").select("email, rol")
    .eq("empresa_id", emp.id).eq("activo", true).not("email", "is", null);

  const preferidos = correosDev();
  const res: Partial<Record<Acceso, string>> = {};
  for (const a of LISTA_ACCESOS) {
    const candidatos = (data ?? []).filter((m) => ACCESOS[a].roles.includes(m.rol)).map((m) => m.email!.toLowerCase());
    res[a] = candidatos.find((e) => e.startsWith(a)) ?? candidatos.find((e) => preferidos.includes(e)) ?? candidatos[0];
  }
  return res;
}
