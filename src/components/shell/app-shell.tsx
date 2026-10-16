"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, BarChart3, Boxes, Building2, ChevronDown, Handshake, Home, LogOut,
  Menu, MoreHorizontal, Scale, Settings, Tag, Truck, Users, Wallet, X,
} from "lucide-react";
import { puede, type Accion } from "@/lib/permisos";
import { ETIQUETA_ROL } from "@/lib/formato";
import type { Rol } from "@/lib/tipos";
import { cx } from "@/components/ui/clases";
import { cambiarEmpresa } from "./acciones";

interface Item {
  href: string;
  texto: string;
  icono: React.ComponentType<{ className?: string }>;
  permiso?: Accion[];
  grupo: "operacion" | "maestros" | "gestion";
}

const ITEMS: Item[] = [
  { href: "/", texto: "Inicio", icono: Home, grupo: "operacion", permiso: ["verTodo", "caja"] },
  { href: "/comprar", texto: "Comprar", icono: Scale, grupo: "operacion", permiso: ["comprar"] },
  { href: "/compras", texto: "Compras", icono: ArrowDownToLine, grupo: "operacion" },
  { href: "/vender", texto: "Vender", icono: Truck, grupo: "operacion", permiso: ["vender"] },
  { href: "/ventas", texto: "Ventas", icono: ArrowUpFromLine, grupo: "operacion", permiso: ["vender", "verTodo"] },
  { href: "/inventario", texto: "Inventario", icono: Boxes, grupo: "operacion", permiso: ["verTodo", "vender"] },
  { href: "/caja", texto: "Caja", icono: Wallet, grupo: "operacion", permiso: ["caja", "verTodo"] },
  { href: "/precios", texto: "Precios del día", icono: Tag, grupo: "maestros" },
  { href: "/proveedores", texto: "Proveedores", icono: Users, grupo: "maestros" },
  { href: "/compradores", texto: "Compradores", icono: Building2, grupo: "maestros", permiso: ["vender", "verTodo"] },
  { href: "/socios", texto: "Socios", icono: Handshake, grupo: "gestion", permiso: ["verTodo"] },
  { href: "/reportes", texto: "Reportes", icono: BarChart3, grupo: "gestion", permiso: ["verReportes"] },
  { href: "/configuracion", texto: "Configuración", icono: Settings, grupo: "gestion", permiso: ["configurar"] },
];

const GRUPOS = { operacion: "Operación", maestros: "Maestros", gestion: "Gestión" } as const;

const visible = (rol: Rol, i: Item) => !i.permiso || i.permiso.some((p) => puede(rol, p));
const activo = (ruta: string, href: string) =>
  href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(href + "/");

export function AppShell({
  rol, nombre, empresa, empresas, children,
}: {
  rol: Rol;
  nombre: string;
  empresa: { id: string; razon_social: string };
  empresas: { id: string; razon_social: string; rol: Rol }[];
  children: React.ReactNode;
}) {
  const ruta = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const items = ITEMS.filter((i) => visible(rol, i));

  const navegacion = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {(Object.keys(GRUPOS) as (keyof typeof GRUPOS)[]).map((g) => {
        const del = items.filter((i) => i.grupo === g);
        if (del.length === 0) return null;
        return (
          <div key={g}>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{GRUPOS[g]}</p>
            <ul className="space-y-0.5">
              {del.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={() => setMenuAbierto(false)}
                    className={cx(
                      "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium",
                      activo(ruta, i.href) ? "bg-marca-50 text-marca-700" : "text-stone-700 hover:bg-stone-100",
                    )}
                  >
                    <i.icono className="size-[18px] shrink-0" />
                    {i.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const pieUsuario = (
    <div className="border-t border-stone-200 p-3">
      <div className="mb-2 px-2">
        <p className="truncate text-sm font-medium">{nombre}</p>
        <p className="text-xs text-stone-500">{ETIQUETA_ROL[rol]}</p>
      </div>
      <form action="/auth/salir" method="post">
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-stone-600 hover:bg-stone-100">
          <LogOut className="size-4" /> Cerrar sesión
        </button>
      </form>
    </div>
  );

  const selectorEmpresa = (
    <div className="border-b border-stone-200 px-3 py-3">
      {empresas.length > 1 ? (
        <form action={cambiarEmpresa} className="relative">
          <select
            name="empresa_id"
            defaultValue={empresa.id}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="w-full appearance-none truncate rounded-lg border border-stone-200 bg-stone-50 py-2 pl-2 pr-7 text-sm font-semibold"
          >
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-4 text-stone-400" />
        </form>
      ) : (
        <p className="truncate px-2 text-sm font-semibold">{empresa.razon_social}</p>
      )}
    </div>
  );

  const barraInferior = items.filter((i) => ["/", "/comprar", "/compras", "/caja"].includes(i.href));

  return (
    <div className="min-h-dvh md:pl-64">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-white md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-stone-200 px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-7" />
          <span className="font-semibold tracking-tight">Metales</span>
        </div>
        {selectorEmpresa}
        {navegacion}
        {pieUsuario}
      </aside>

      {/* Barra superior (celular) */}
      <header className="no-imprimir sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-4 backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-7" />
          <span className="truncate text-sm font-semibold">{empresa.razon_social}</span>
        </div>
        <button onClick={() => setMenuAbierto(true)} className="rounded-lg p-2 hover:bg-stone-100" aria-label="Menú">
          <Menu className="size-5" />
        </button>
      </header>

      {/* Menú deslizable (celular) */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => setMenuAbierto(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-stone-200 px-4">
              <span className="font-semibold">Menú</span>
              <button onClick={() => setMenuAbierto(false)} className="rounded-lg p-2 hover:bg-stone-100" aria-label="Cerrar">
                <X className="size-5" />
              </button>
            </div>
            {selectorEmpresa}
            {navegacion}
            {pieUsuario}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 md:pb-10 md:pt-6">{children}</main>

      {/* Barra inferior (celular) */}
      <nav className="no-imprimir fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${barraInferior.length + 1}, minmax(0, 1fr))` }}>
          {barraInferior.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className={cx(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  i.href === "/comprar" || activo(ruta, i.href) ? "text-marca-700" : "text-stone-500",
                )}
              >
                {i.href === "/comprar" ? (
                  <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-marca-600 text-white shadow-lg ring-4 ring-white">
                    <i.icono className="size-6" />
                  </span>
                ) : (
                  <i.icono className="size-5" />
                )}
                {i.texto}
              </Link>
            </li>
          ))}
          <li>
            <button
              onClick={() => setMenuAbierto(true)}
              className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-stone-500"
            >
              <MoreHorizontal className="size-5" />
              Más
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
