// Tipos de dominio. Cuando el proyecto de Supabase esté enlazado, `pnpm db:types`
// genera src/lib/supabase/database.types.ts con los tipos exactos de la BD.
export type Rol = "dueno" | "socio" | "cajero" | "balancero";
export type MedioPago = "efectivo" | "yape" | "plin" | "transferencia";
export type TipoDoc = "DNI" | "RUC" | "CE" | "SIN_DOC";

export interface Empresa {
  id: string;
  razon_social: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  logo_url: string | null;
  monto_doc_obligatorio: string | null;
  roles_editan_precio: Rol[];
}

export interface Metal {
  id: string;
  nombre: string;
  color: string | null;
  orden: number;
  unidad: string;
  precio_compra: string;
  precio_venta: string;
  activo: boolean;
}

export interface Caja {
  id: string;
  nombre: string;
  tipo: "efectivo" | "banco" | "billetera";
  activo: boolean;
  orden: number;
}

export interface Proveedor {
  id: string;
  tipo_doc: TipoDoc;
  nro_doc: string | null;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
}

export interface Comprador {
  id: string;
  ruc: string | null;
  razon_social: string;
  direccion: string | null;
  telefono: string | null;
  contacto: string | null;
  activo: boolean;
}

export type Resultado<T = unknown> = { ok: true; data: T } | { ok: false; error: string };
