import {
  ArrowDownToLine, ArrowUpFromLine, BarChart3, Boxes, Building2, ClipboardList, Contact, Handshake, Home, Landmark,
  PackageCheck, PiggyBank, PlusCircle, Search, Settings, Tag, Users, Wallet,
} from "lucide-react";
import { puede, type Accion } from "@/lib/permisos";
import type { Rol } from "@/lib/tipos";

// Mapa de navegación por MÓDULOS: cada módulo agrupa sus pantallas (registrar, historial, terceros, reportes).
// Lo usan la barra lateral y las pestañas superiores de cada módulo.

type Icono = React.ComponentType<{ className?: string }>;

export interface SubItem {
  href: string;
  texto: string;
  icono: Icono;
  permiso?: Accion[];
}

// Color de cada módulo para ubicarse rápido. Clases escritas completas para que Tailwind las genere.
// (Verde/rojo/ámbar quedan reservados para estados: registrada, anulada, pendiente.)
export const TONOS = {
  marca: { texto: "text-marca-700", fondo: "bg-marca-50", borde: "border-marca-600", chip: "bg-marca-100 text-marca-700", barra: "border-l-marca-600" },
  teal: { texto: "text-teal-700", fondo: "bg-teal-50", borde: "border-teal-600", chip: "bg-teal-100 text-teal-700", barra: "border-l-teal-600" },
  indigo: { texto: "text-indigo-700", fondo: "bg-indigo-50", borde: "border-indigo-600", chip: "bg-indigo-100 text-indigo-700", barra: "border-l-indigo-600" },
  violet: { texto: "text-violet-700", fondo: "bg-violet-50", borde: "border-violet-600", chip: "bg-violet-100 text-violet-700", barra: "border-l-violet-600" },
  fuchsia: { texto: "text-fuchsia-700", fondo: "bg-fuchsia-50", borde: "border-fuchsia-600", chip: "bg-fuchsia-100 text-fuchsia-700", barra: "border-l-fuchsia-600" },
  sky: { texto: "text-sky-700", fondo: "bg-sky-50", borde: "border-sky-600", chip: "bg-sky-100 text-sky-700", barra: "border-l-sky-600" },
  stone: { texto: "text-stone-800", fondo: "bg-stone-100", borde: "border-stone-600", chip: "bg-stone-200 text-stone-700", barra: "border-l-stone-500" },
} as const;
export type Tono = keyof typeof TONOS;

export interface Modulo {
  id: string;
  texto: string;
  icono: Icono;
  tono: Tono;
  /** Pantallas del módulo, en el orden de las pestañas */
  items: SubItem[];
}

export const MODULOS: Modulo[] = [
  {
    id: "inicio", texto: "Inicio", icono: Home, tono: "marca",
    items: [{ href: "/", texto: "Inicio", icono: Home }],
  },
  {
    id: "compras", texto: "Compras", icono: ArrowDownToLine, tono: "teal",
    items: [
      { href: "/comprar", texto: "Nueva compra", icono: PlusCircle, permiso: ["comprar"] },
      { href: "/compras", texto: "Historial", icono: ClipboardList },
      { href: "/compras/reportes", texto: "Reportes", icono: BarChart3, permiso: ["verReportes"] },
    ],
  },
  {
    id: "ventas", texto: "Ventas", icono: ArrowUpFromLine, tono: "indigo",
    items: [
      { href: "/vender", texto: "Nueva venta", icono: PlusCircle, permiso: ["vender"] },
      { href: "/ventas", texto: "Historial", icono: ClipboardList, permiso: ["vender", "verTodo"] },
      { href: "/ventas/reportes", texto: "Reportes", icono: BarChart3, permiso: ["verReportes"] },
    ],
  },
  {
    id: "contactos", texto: "Contactos", icono: Contact, tono: "fuchsia",
    items: [
      { href: "/contactos", texto: "Buscar", icono: Search },
      { href: "/proveedores", texto: "Proveedores", icono: Users },
      { href: "/compradores", texto: "Clientes", icono: Building2, permiso: ["vender", "verTodo"] },
    ],
  },
  {
    id: "inventario", texto: "Inventario", icono: Boxes, tono: "violet",
    items: [
      { href: "/inventario", texto: "Stock", icono: Boxes, permiso: ["verTodo", "vender"] },
      { href: "/limpieza", texto: "Limpieza", icono: PackageCheck, permiso: ["limpiar", "verTodo"] },
      { href: "/precios", texto: "Productos y precios", icono: Tag },
      { href: "/inventario/reportes", texto: "Reportes", icono: BarChart3, permiso: ["verReportes"] },
    ],
  },
  {
    id: "finanzas", texto: "Caja y finanzas", icono: Landmark, tono: "sky",
    items: [
      { href: "/caja", texto: "Caja", icono: Wallet, permiso: ["caja", "verTodo"] },
      { href: "/capital", texto: "Capital y cierres", icono: PiggyBank, permiso: ["verTodo"] },
      { href: "/caja/reportes", texto: "Reportes", icono: BarChart3, permiso: ["verReportes"] },
    ],
  },
  {
    id: "gestion", texto: "Gestión", icono: Settings, tono: "stone",
    items: [
      { href: "/reportes", texto: "Todos los reportes", icono: BarChart3, permiso: ["verReportes"] },
      // Socios: información de la sociedad (participación y capital), no un contacto del día a día
      { href: "/socios", texto: "Socios", icono: Handshake, permiso: ["verTodo"] },
      { href: "/configuracion", texto: "Configuración", icono: Settings, permiso: ["configurar"] },
    ],
  },
];

export const visible = (rol: Rol, i: SubItem) => !i.permiso || i.permiso.some((p) => puede(rol, p));

/** Módulos con solo las pantallas que el rol puede ver (los vacíos se quitan). */
export function modulosPara(rol: Rol): Modulo[] {
  return MODULOS.map((m) => ({ ...m, items: m.items.filter((i) => visible(rol, i)) })).filter((m) => m.items.length > 0);
}

const coincide = (ruta: string, href: string) => (href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(href + "/"));

/** La pantalla activa es la de href más largo que coincide (así /compras/reportes no marca "Historial"). */
export function itemActivo(modulos: Modulo[], ruta: string): { modulo: Modulo; item: SubItem } | null {
  let mejor: { modulo: Modulo; item: SubItem } | null = null;
  for (const modulo of modulos) {
    for (const item of modulo.items) {
      if (coincide(ruta, item.href) && (!mejor || item.href.length > mejor.item.href.length)) mejor = { modulo, item };
    }
  }
  return mejor;
}
