"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, Home, LogOut, Menu, MoreHorizontal, Scale, Wallet, X } from "lucide-react";
import { ETIQUETA_ROL } from "@/lib/formato";
import type { Rol } from "@/lib/tipos";
import { cx } from "@/components/ui/clases";
import { cambiarEmpresa } from "./acciones";
import { itemActivo, modulosPara, TONOS } from "./modulos";
import { AccesosPreferencias } from "@/components/preferencias/preferencias";
import type { Letra, Tema } from "@/lib/preferencias";

// Accesos de la barra inferior (celular), por prioridad; se muestran los 4 primeros que el rol puede ver.
const BARRA_INFERIOR = [
  { href: "/", texto: "Inicio", icono: Home },
  { href: "/compras", texto: "Compras", icono: ArrowDownToLine },
  { href: "/comprar", texto: "Comprar", icono: Scale },
  { href: "/ventas", texto: "Ventas", icono: ArrowUpFromLine },
  { href: "/caja", texto: "Caja", icono: Wallet },
];

export function AppShell({
  rol, nombre, empresa, empresas, tema, letra, children,
}: {
  tema: Tema;
  letra: Letra;
  rol: Rol;
  nombre: string;
  empresa: { id: string; razon_social: string };
  empresas: { id: string; razon_social: string; rol: Rol }[];
  children: React.ReactNode;
}) {
  const ruta = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const modulos = modulosPara(rol);
  const actual = itemActivo(modulos, ruta);
  const visibles = new Set(modulos.flatMap((m) => m.items.map((i) => i.href)));

  const navegacion = (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {modulos.map((m) => {
        const moduloActivo = actual?.modulo.id === m.id;
        const t = TONOS[m.tono];
        // Módulo de una sola pantalla (Inicio): enlace directo, sin subtítulo
        if (m.items.length === 1 && m.id === "inicio") {
          const i = m.items[0];
          return (
            <Link
              key={m.id}
              href={i.href}
              onClick={() => setMenuAbierto(false)}
              className={cx(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold",
                moduloActivo ? cx(t.fondo, t.texto) : "text-stone-800 hover:bg-stone-100",
              )}
            >
              <m.icono className="size-[18px] shrink-0" />
              {m.texto}
            </Link>
          );
        }
        return (
          <div key={m.id}>
            <p className="flex items-center gap-2 px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <span className={cx("flex size-6 items-center justify-center rounded-md", t.chip)}>
                <m.icono className="size-3.5 shrink-0" />
              </span>
              {m.texto}
            </p>
            <ul className="ml-[15px] space-y-0.5 border-l border-stone-200 pl-2">
              {m.items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={() => setMenuAbierto(false)}
                    className={cx(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium",
                      actual?.item.href === i.href ? cx(t.fondo, t.texto) : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                    )}
                  >
                    <i.icono className="size-4 shrink-0" />
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

  // Pestañas del módulo actual, arriba del contenido (celular y escritorio)
  const tonoActual = actual ? TONOS[actual.modulo.tono] : TONOS.marca;
  const pestanas = actual && actual.modulo.items.length > 1 && (
    <div className="no-imprimir mb-4 border-b border-stone-200">
      <p className={cx("mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider", tonoActual.chip)}>
        <actual.modulo.icono className="size-3.5" /> {actual.modulo.texto}
      </p>
      <div className="-mb-px flex gap-1 overflow-x-auto">
        {actual.modulo.items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={cx(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              actual.item.href === i.href
                ? cx(tonoActual.borde, tonoActual.texto)
                : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800",
            )}
          >
            <i.icono className="size-4" />
            {i.texto}
          </Link>
        ))}
      </div>
    </div>
  );

  const pieUsuario = (
    <div className="border-t border-stone-200 p-3">
      <AccesosPreferencias tema={tema} letra={letra} />
      <Link href="/cuenta" onClick={() => setMenuAbierto(false)} className="mb-2 block rounded-lg px-2 py-1 hover:bg-stone-100">
        <p className="truncate text-sm font-medium">{nombre}</p>
        <p className="text-xs text-stone-500">{ETIQUETA_ROL[rol]} · Mi cuenta</p>
      </Link>
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

  const barraInferior = BARRA_INFERIOR.filter((b) => visibles.has(b.href)).slice(0, 4);
  // En la barra inferior, "Compras"/"Ventas"/"Caja" se marcan en cualquier pantalla de su módulo
  const moduloDe = (href: string) => modulos.find((m) => m.items.some((i) => i.href === href))?.id;

  return (
    <div className="min-h-dvh md:pl-64">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-superficie md:flex">
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
      <header className="no-imprimir sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-stone-200 bg-superficie/95 px-4 backdrop-blur md:hidden">
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAbierto(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-superficie shadow-xl">
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

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 md:pb-10 md:pt-6">
        {pestanas}
        {children}
      </main>

      {/* Barra inferior (celular) */}
      <nav className="no-imprimir fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${barraInferior.length + 1}, minmax(0, 1fr))` }}>
          {barraInferior.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className={cx(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  i.href === "/comprar" || (actual?.item.href !== "/comprar" && moduloDe(i.href) === actual?.modulo.id) ? "text-marca-700" : "text-stone-500",
                )}
              >
                {i.href === "/comprar" ? (
                  <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-marca-600 text-white shadow-lg ring-4 ring-superficie">
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
