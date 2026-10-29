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

// Color de cada módulo para ubicarse rápido: una sola familia de azules (matiz y saturación distintos) que
// combina con la marca. Claves por MÓDULO, no por color. Clases escritas completas para que Tailwind las genere.
// Verde/rojo/ámbar quedan reservados para estados (registrada, anulada, pendiente).
export const TONOS = {
  inicio: { texto: "text-marca-700", fondo: "bg-marca-50", borde: "border-marca-600", chip: "bg-marca-100 text-marca-700", barra: "border-l-marca-600" },
  compras: { texto: "text-sky-700", fondo: "bg-sky-50", borde: "border-sky-600", chip: "bg-sky-100 text-sky-700", barra: "border-l-sky-600" },
  ventas: { texto: "text-anil-700", fondo: "bg-anil-50", borde: "border-anil-600", chip: "bg-anil-100 text-anil-700", barra: "border-l-anil-600" },
  contactos: { texto: "text-cyan-700", fondo: "bg-cyan-50", borde: "border-cyan-600", chip: "bg-cyan-100 text-cyan-700", barra: "border-l-cyan-600" },
  inventario: { texto: "text-acero-700", fondo: "bg-acero-50", borde: "border-acero-600", chip: "bg-acero-100 text-acero-700", barra: "border-l-acero-600" },
  caja: { texto: "text-blue-700", fondo: "bg-blue-50", borde: "border-blue-600", chip: "bg-blue-100 text-blue-700", barra: "border-l-blue-600" },
  gestion: { texto: "text-stone-800", fondo: "bg-stone-100", borde: "border-stone-600", chip: "bg-stone-200 text-stone-700", barra: "border-l-stone-500" },
} as const;
export type Tono = keyof typeof TONOS;

// Acento de cada módulo dentro de la barra lateral azul: hex fijos (TONOS se invierte en modo oscuro
// y sobre el azul quedaría apagado). Ícono del módulo y franja de la barra contraída.
export const ACENTO_LATERAL: Record<Tono, string> = {
  inicio: "#ffffff", compras: "#38bdf8", ventas: "#a5b0f5", contactos: "#67e8f9", inventario: "#9fbad6", caja: "#60a5fa", gestion: "#94a3b8",
};

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
    id: "inicio", texto: "Inicio", icono: Home, tono: "inicio",
    items: [{ href: "/", texto: "Inicio", icono: Home }],
  },
  {
    id: "compras", texto: "Compras", icono: ArrowDownToLine, tono: "compras",
    items: [
      { href: "/comprar", texto: "Nueva compra", icono: PlusCircle, permiso: ["comprar"] },
      { href: "/compras", texto: "Historial", icono: ClipboardList },
      { href: "/compras/reportes", texto: "Reportes", icono: BarChart3, permiso: ["verReportes"] },
    ],
  },
  {
    id: "ventas", texto: "Ventas", icono: ArrowUpFromLine, tono: "ventas",
    items: [
      { href: "/vender", texto: "Nueva venta", icono: PlusCircle, permiso: ["vender"] },
      { href: "/ventas", texto: "Historial", icono: ClipboardList, permiso: ["vender", "verTodo"] },
      { href: "/ventas/reportes", texto: "Reportes", icono: BarChart3, permiso: ["verReportes"] },
    ],
  },
  {
    id: "contactos", texto: "Contactos", icono: Contact, tono: "contactos",
    items: [
      { href: "/contactos", texto: "Buscar", icono: Search },
      { href: "/proveedores", texto: "Proveedores", icono: Users },
      { href: "/compradores", texto: "Clientes", icono: Building2, permiso: ["vender", "verTodo"] },
    ],
  },
  {
    id: "inventario", texto: "Inventario", icono: Boxes, tono: "inventario",
    items: [
      { href: "/inventario", texto: "Stock", icono: Boxes, permiso: ["verTodo", "vender"] },
      { href: "/limpieza", texto: "Limpieza", icono: PackageCheck, permiso: ["limpiar", "verTodo"] },
      { href: "/precios", texto: "Productos y precios", icono: Tag },
      { href: "/inventario/reportes", texto: "Reportes", icono: BarChart3, permiso: ["verReportes"] },
    ],
  },
  {
    id: "finanzas", texto: "Caja y finanzas", icono: Landmark, tono: "caja",
    items: [
      { href: "/caja", texto: "Caja", icono: Wallet, permiso: ["caja", "verTodo"] },
      { href: "/capital", texto: "Capital y cierres", icono: PiggyBank, permiso: ["verTodo"] },
      { href: "/caja/reportes", texto: "Reportes", icono: BarChart3, permiso: ["verReportes"] },
    ],
  },
  {
    id: "gestion", texto: "Gestión", icono: Settings, tono: "gestion",
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
