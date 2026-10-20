"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, ChevronDown, Home, Menu, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Scale, Wallet, X,
} from "lucide-react";
import type { Rol } from "@/lib/tipos";
import { cx } from "@/components/ui/clases";
import { cambiarEmpresa } from "./acciones";
import { itemActivo, modulosPara, TONOS } from "./modulos";
import { BotonLetra, BotonTema, guardar, usePreferencias } from "@/components/preferencias/preferencias";
import { COOKIE_MENU, type Letra, type Tema } from "@/lib/preferencias";
import { useNotificar } from "@/components/ui/notificaciones";
import { AvisoConexion } from "./aviso-conexion";
import { IndicadorNavegacion } from "./indicador-navegacion";
import { MenuUsuario } from "./menu-usuario";
import { BotonInstalar } from "./instalar-app";

// Accesos de la barra inferior (celular), por prioridad; se muestran los 4 primeros que el rol puede ver.
const BARRA_INFERIOR = [
  { href: "/", texto: "Inicio", icono: Home },
  { href: "/compras", texto: "Compras", icono: ArrowDownToLine },
  { href: "/comprar", texto: "Comprar", icono: Scale },
  { href: "/ventas", texto: "Ventas", icono: ArrowUpFromLine },
  { href: "/caja", texto: "Caja", icono: Wallet },
];

// Estructura: barra lateral = solo secciones (contraíble a iconos en escritorio);
// barra superior = empresa a la izquierda; tema, letra y usuario (Mi cuenta / Cerrar sesión) a la derecha.
export function AppShell({
  rol, nombre, empresa, empresas, tema, letra, compacto: compactoInicial, children,
}: {
  tema: Tema;
  letra: Letra;
  /** Barra lateral contraída (cookie, para que no salte al cargar) */
  compacto: boolean;
  rol: Rol;
  nombre: string;
  empresa: { id: string; razon_social: string };
  empresas: { id: string; razon_social: string; rol: Rol }[];
  children: React.ReactNode;
}) {
  const ruta = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [compacto, setCompacto] = useState(compactoInicial);
  const preferencias = usePreferencias(tema, letra);
  const notificar = useNotificar();
  const modulos = modulosPara(rol);
  const actual = itemActivo(modulos, ruta);
  const visibles = new Set(modulos.flatMap((m) => m.items.map((i) => i.href)));

  const alternarCompacto = () => {
    setCompacto(!compacto);
    guardar(COOKIE_MENU, compacto ? "normal" : "compacto");
  };

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
              prefetch
              onClick={() => setMenuAbierto(false)}
              className={cx(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold",
                moduloActivo ? cx(t.fondo, t.texto) : "text-stone-800 hover:bg-stone-100",
              )}
            >
              <m.icono className="size-[18px] shrink-0" />
              {m.texto}
              <IndicadorNavegacion />
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
                    prefetch
                    onClick={() => setMenuAbierto(false)}
                    className={cx(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium",
                      actual?.item.href === i.href ? cx(t.fondo, t.texto) : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                    )}
                  >
                    <i.icono className="size-4 shrink-0" />
                    {i.texto}
                    <IndicadorNavegacion />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  // Barra contraída: solo iconos, con el color de su módulo para distinguir p. ej. "Historial" de compras y de ventas.
  // El nombre sale al pasar el mouse (title) y lo leen los lectores de pantalla (aria-label).
  const navegacionCompacta = (
    <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Secciones">
      {modulos.map((m, n) => {
        const t = TONOS[m.tono];
        return (
          <div key={m.id} className={cx(n > 0 && "mt-2 border-t border-stone-200 pt-2")}>
            <ul className="space-y-1">
              {m.items.map((i) => {
                const activo = actual?.item.href === i.href;
                const nombreItem = m.items.length === 1 ? m.texto : `${m.texto} · ${i.texto}`;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      prefetch
                      title={nombreItem}
                      aria-label={nombreItem}
                      className={cx(
                        "flex h-10 items-center justify-center rounded-lg",
                        activo ? cx(t.fondo, t.texto) : cx(t.texto, "opacity-75 hover:bg-stone-100 hover:opacity-100"),
                      )}
                    >
                      <i.icono className="size-[18px]" />
                      <IndicadorNavegacion />
                    </Link>
                  </li>
                );
              })}
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
            prefetch
            className={cx(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              actual.item.href === i.href
                ? cx(tonoActual.borde, tonoActual.texto)
                : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800",
            )}
          >
            <i.icono className="size-4" />
            {i.texto}
            <IndicadorNavegacion />
          </Link>
        ))}
      </div>
    </div>
  );

  const selectorEmpresa = (
    empresas.length > 1 ? (
      <form action={cambiarEmpresa} className="relative w-full min-w-0 max-w-xs">
        <select
          name="empresa_id"
          defaultValue={empresa.id}
          aria-label="Empresa"
          onChange={(e) => {
            const elegida = empresas.find((x) => x.id === e.currentTarget.value);
            notificar({ tono: "info", titulo: "Cambiando de empresa", mensaje: `Abriendo ${elegida?.razon_social ?? "la empresa"}…` });
            e.currentTarget.form?.requestSubmit();
          }}
          className="w-full appearance-none truncate rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-2.5 pr-8 text-sm font-semibold"
        >
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-2 size-4 text-stone-400" />
      </form>
    ) : (
      <p className="truncate text-sm font-semibold">{empresa.razon_social}</p>
    )
  );

  const logo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icon.svg" alt="" className="size-7 shrink-0" />
  );

  const barraInferior = BARRA_INFERIOR.filter((b) => visibles.has(b.href)).slice(0, 4);
  // En la barra inferior, "Compras"/"Ventas"/"Caja" se marcan en cualquier pantalla de su módulo
  const moduloDe = (href: string) => modulos.find((m) => m.items.some((i) => i.href === href))?.id;

  return (
    <div className={cx("min-h-dvh transition-[padding] duration-200", compacto ? "md:pl-16" : "md:pl-64")}>
      {/* Barra lateral (escritorio): solo secciones */}
      <aside className={cx(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-stone-200 bg-superficie transition-[width] duration-200 md:flex",
        compacto ? "w-16" : "w-64",
      )}>
        <Link href="/" prefetch className={cx("flex h-14 shrink-0 items-center gap-2 border-b border-stone-200", compacto ? "justify-center" : "px-5")} title="Inicio">
          {logo}
          {!compacto && <span className="font-semibold tracking-tight">Otiniano</span>}
        </Link>
        {compacto ? navegacionCompacta : navegacion}
        <div className="border-t border-stone-200 p-2">
          <button
            type="button"
            onClick={alternarCompacto}
            title={compacto ? "Expandir menú" : "Contraer menú"}
            aria-label={compacto ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!compacto}
            className={cx(
              "flex h-10 w-full items-center gap-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900",
              compacto ? "justify-center" : "px-3",
            )}
          >
            {compacto ? <PanelLeftOpen className="size-[18px]" /> : <><PanelLeftClose className="size-[18px]" /> Contraer menú</>}
          </button>
        </div>
      </aside>

      {/* Barra superior: empresa | tema, letra y usuario */}
      <header className="no-imprimir sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-stone-200 bg-superficie/95 px-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="md:hidden">{logo}</span>
          <div className="min-w-0 flex-1">{selectorEmpresa}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <BotonInstalar className="mr-0.5" />
          <div className="hidden items-center gap-1 sm:flex">
            <BotonTema p={preferencias} />
            <BotonLetra p={preferencias} />
            <span aria-hidden className="mx-1 h-6 w-px bg-stone-200" />
          </div>
          <MenuUsuario nombre={nombre} rol={rol} p={preferencias} />
          <button onClick={() => setMenuAbierto(true)} className="rounded-lg p-2 hover:bg-stone-100 md:hidden" aria-label="Menú">
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* Menú deslizable (celular): solo secciones; la cuenta está en la barra superior */}
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
            {navegacion}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 md:pb-10 md:pt-6">
        {pestanas}
        {children}
      </main>

      <AvisoConexion />

      {/* Barra inferior (celular) */}
      <nav className="no-imprimir fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${barraInferior.length + 1}, minmax(0, 1fr))` }}>
          {barraInferior.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                prefetch
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
                <IndicadorNavegacion />
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
