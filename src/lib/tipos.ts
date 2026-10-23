// Tipos de dominio. Cuando el proyecto de Supabase esté enlazado, `pnpm db:types`
// genera src/lib/supabase/database.types.ts con los tipos exactos de la BD.
/** dueno = Gerencia · administrador = Administración · cajero = Almacén */
export type Rol = "dueno" | "administrador" | "socio" | "cajero" | "balancero";
export type ClaseProveedor = "minorista" | "mayorista";
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
  /** Días que una compra puede esperar su selección en almacén antes de verse «retrasada» */
  dias_seleccion: number;
  /** % de merma de limpieza desde el cual se marca para revisión de Gerencia */
  merma_alerta_pct: string;
}

/** Producto (la tabla se llama metales): un nodo de la jerarquía familia → producto → variante… */
export interface Metal {
  id: string;
  padre_id: string | null;
  codigo: string | null;
  nombre: string;
  color: string | null;
  orden: number;
  unidad: string;
  precio_compra: string;
  /** Precio de compra al mayorista; null = igual al minorista */
  precio_mayorista: string | null;
  precio_venta: string;
  activo: boolean;
}

/** Producto con su ubicación en el árbol (vista v_productos) */
export interface Producto extends Metal {
  nivel: number;
  ruta: string;
  clave_orden: string;
  tiene_hijos: boolean;
}

/** Medio de pago configurable: tipo base y caja que usa por defecto */
export interface MedioPagoConf {
  id: string;
  nombre: string;
  tipo: MedioPago;
  caja_id: string | null;
  orden: number;
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
  clase: ClaseProveedor;
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

/** Resumen de un turno de caja (apertura → cierre), calculado por resumen_turno() en la BD */
export interface ResumenTurno {
  id: string;
  numero: number;
  caja: string;
  caja_id: string;
  abierto_en: string;
  abierto_por: string | null;
  cerrado_en: string | null;
  cerrado_por: string | null;
  saldo_apertura: number;
  contado_apertura: number;
  diferencia_apertura: number;
  ingresos: number;
  egresos: number;
  esperado: number;
  otros: number;
  saldo_sistema: number;
  contado_cierre: number | null;
  diferencia_cierre: number | null;
  ajustado: boolean;
  nota_apertura: string | null;
  nota_cierre: string | null;
  anulados: number;
  detalle: { origen: string; tipo: "ingreso" | "egreso"; cantidad: number; monto: number }[];
}

export type Resultado<T = unknown> ={ ok: true; data: T } | { ok: false; error: string };
