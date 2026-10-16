import type { Rol } from "./tipos";

// Espejo de la RLS/RPC para mostrar u ocultar botones. La garantía real está en la BD.
const PERMISOS = {
  comprar: ["dueno", "cajero", "balancero"],
  vender: ["dueno", "cajero"],
  anular: ["dueno"],
  editarPrecios: ["dueno"],
  ajustarInventario: ["dueno"],
  caja: ["dueno", "cajero"],
  socios: ["dueno"],
  verReportes: ["dueno", "socio"],
  verTodo: ["dueno", "socio"],
  configurar: ["dueno"],
  editarTerceros: ["dueno", "cajero"],
} as const satisfies Record<string, readonly Rol[]>;

export type Accion = keyof typeof PERMISOS;

export function puede(rol: Rol | null | undefined, accion: Accion): boolean {
  return !!rol && (PERMISOS[accion] as readonly Rol[]).includes(rol);
}
