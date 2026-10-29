// Accesos por rol (Gerencia, Administración, Almacén) del «Ingreso directo por rol» del login en desarrollo.
// Lo que cada uno puede hacer lo decide la RLS por el rol real del miembro.
export type Acceso = "gerencia" | "administracion" | "almacen";

export const ACCESOS: Record<Acceso, { titulo: string; roles: string[] }> = {
  gerencia: { titulo: "Gerencia", roles: ["dueno", "socio"] },
  administracion: { titulo: "Administración", roles: ["administrador"] },
  almacen: { titulo: "Almacén", roles: ["cajero", "balancero"] },
};

export const LISTA_ACCESOS = Object.keys(ACCESOS) as Acceso[];
