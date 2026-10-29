"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, ChevronDown, Home, Menu, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Scale, Wallet, X,
} from "lucide-react";
import type { Rol } from "@/lib/tipos";
import { cx } from "@/components/ui/clases";
import { cambiarEmpresa } from "./acciones";
import { ACENTO_LATERAL, itemActivo, modulosPara, TONOS } from "./modulos";
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

// Barra lateral azul (fija en claro y oscuro): solo colores literales o tokens lateral-* que el modo oscuro no toca.
// Activo = pastilla blanca (no solo color: además aria-current); foco visible en cian.
const FOCO_LATERAL = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cian-400";
// Blanco literal a propósito: bg-superficie se oscurece en modo oscuro y la pastilla dejaría de resaltar
const ACTIVO_LATERAL = "bg-[#ffffff] font-semibold text-lateral shadow-sm";
const INACTIVO_LATERAL = "text-lateral-texto hover:bg-white/10 hover:text-white";

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
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const modulos = modulosPara(rol);
  const actual = itemActivo(modulos, ruta);
  const visibles = new Set(modulos.flatMap((m) => m.items.map((i) => i.href)));

  const alternarCompacto = () => {
    setCompacto(!compacto);
    guardar(COOKIE_MENU, compacto ? "normal" : "compacto");
  };

  // Menú del celular: Escape lo cierra, la página de atrás no se desplaza y el foco entra al menú
  useEffect(() => {
    if (!menuAbierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuAbierto(false); };
    const desborde = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alTeclear);
    cerrarRef.current?.focus();
    return () => {
      document.body.style.overflow = desborde;
      document.removeEventListener("keydown", alTeclear);
    };
  }, [menuAbierto]);

  const navegacion = (
    <nav className="sin-barra flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Secciones">
      {modulos.map((m) => {
        const moduloActivo = actual?.modulo.id === m.id;
        // Módulo de una sola pantalla (Inicio): enlace directo, sin subtítulo
        if (m.items.length === 1 && m.id === "inicio") {
          const i = m.items[0];
          return (
            <Link
              key={m.id}
              href={i.href}
              prefetch
              onClick={() => setMenuAbierto(false)}
              aria-current={moduloActivo ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                FOCO_LATERAL, moduloActivo ? ACTIVO_LATERAL : INACTIVO_LATERAL,
              )}
            >
              <m.icono className={cx("size-[18px] shrink-0", moduloActivo && "text-marca-600")} />
              {m.texto}
              <IndicadorNavegacion />
            </Link>
          );
        }
        return (
          <div key={m.id}>
            <p className="flex items-center gap-2 px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-lateral-titulo">
              <span className="flex size-6 items-center justify-center rounded-md bg-white/10" style={{ color: ACENTO_LATERAL[m.tono] }}>
                <m.icono className="size-3.5 shrink-0" />
              </span>
              {m.texto}
            </p>
            <ul className="ml-[15px] space-y-0.5 border-l border-white/15 pl-2">
              {m.items.map((i) => {
                const activo = actual?.item.href === i.href;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      prefetch
                      onClick={() => setMenuAbierto(false)}
                      aria-current={activo ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                        FOCO_LATERAL, activo ? ACTIVO_LATERAL : INACTIVO_LATERAL,
                      )}
                    >
                      <i.icono className={cx("size-4 shrink-0", activo && "text-marca-600")} />
                      {i.texto}
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

  // Barra contraída: solo iconos; una franja con el color de cada módulo distingue p. ej. "Historial" de compras y de ventas.
  // El nombre sale al pasar el mouse (title) y lo leen los lectores de pantalla (aria-label).
  const navegacionCompacta = (
    <nav className="sin-barra flex-1 overflow-y-auto px-2 py-3" aria-label="Secciones">
      {modulos.map((m, n) => (
        <div key={m.id} className={cx("relative", n > 0 && "mt-2 border-t border-white/10 pt-2")}>
          <span aria-hidden className={cx("absolute -left-2 bottom-1 w-[3px] rounded-r", n > 0 ? "top-3" : "top-1")}
            style={{ background: ACENTO_LATERAL[m.tono] }} />
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
                    aria-current={activo ? "page" : undefined}
                    className={cx(
                      "flex h-10 items-center justify-center rounded-lg transition-colors",
                      FOCO_LATERAL, activo ? ACTIVO_LATERAL : INACTIVO_LATERAL,
                    )}
                  >
                    <i.icono className={cx("size-[18px]", activo && "text-marca-600")} />
                    <IndicadorNavegacion />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  // Pestañas del módulo actual, arriba del contenido (celular y escritorio)
  const tonoActual = actual ? TONOS[actual.modulo.tono] : TONOS.inicio;
  const pestanas = actual && actual.modulo.items.length > 1 && (
    <div className="no-imprimir mb-4 border-b border-stone-200">
      <p className={cx("mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider", tonoActual.chip)}>
        <actual.modulo.icono className="size-3.5" /> {actual.modulo.texto}
      </p>
      <div className="-mb-px flex gap-1 overflow-x-auto">
        {actual.modulo.items.map((i) => {
          const activa = actual.item.href === i.href;
          return (
            <Link
              key={i.href}
              href={i.href}
              prefetch
              aria-current={activa ? "page" : undefined}
              className={cx(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3 py-2 text-sm",
                activa
                  ? cx(tonoActual.borde, tonoActual.texto, "font-semibold")
                  : "border-transparent font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900",
              )}
            >
              <i.icono className="size-4" />
              {i.texto}
              <IndicadorNavegacion />
            </Link>
          );
        })}
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
          className="w-full appearance-none truncate rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-2.5 pr-8 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-marca-500"
        >
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-2 size-4 text-stone-500" />
      </form>
    ) : (
      <p className="truncate text-sm font-semibold">{empresa.razon_social}</p>
    )
  );

  /* eslint-disable @next/next/no-img-element */
  const logoLateral = compacto
    ? <img src="/marca/isotipo-blanco.png" alt="Grupo Otiniano" className="size-8 object-contain" />
    : <img src="/marca/logo-blanco.png" alt="Grupo Otiniano" className="h-8 w-auto" />;
  // En la barra superior del celular (fondo claro) va el isotipo a color
  const logoSuperior = <img src="/marca/isotipo.png" alt="" className="size-7 shrink-0 object-contain" />;
  /* eslint-enable @next/next/no-img-element */

  const barraInferior = BARRA_INFERIOR.filter((b) => visibles.has(b.href)).slice(0, 4);
  // En la barra inferior, "Compras"/"Ventas"/"Caja" se marcan en cualquier pantalla de su módulo
  const moduloDe = (href: string) => modulos.find((m) => m.items.some((i) => i.href === href))?.id;

  return (
    <div className={cx("min-h-dvh transition-[padding] duration-200 print:pl-0", compacto ? "md:pl-16" : "md:pl-64")}>
      {/* Barra lateral (escritorio): solo secciones */}
      <aside className={cx(
        "fondo-lateral no-imprimir fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/10 text-white transition-[width] duration-200 md:flex",
        compacto ? "w-16" : "w-64",
      )}>
        <Link href="/" prefetch title="Inicio"
          className={cx("flex h-14 shrink-0 items-center border-b border-white/10", FOCO_LATERAL, compacto ? "justify-center" : "px-5")}>
          {logoLateral}
        </Link>
        {compacto ? navegacionCompacta : navegacion}
        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            onClick={alternarCompacto}
            title={compacto ? "Expandir menú" : "Contraer menú"}
            aria-label={compacto ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!compacto}
            className={cx(
              "flex h-10 w-full items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
              FOCO_LATERAL, INACTIVO_LATERAL, compacto ? "justify-center" : "px-3",
            )}
          >
            {compacto ? <PanelLeftOpen className="size-[18px]" /> : <><PanelLeftClose className="size-[18px]" /> Contraer menú</>}
          </button>
        </div>
      </aside>

      {/* Barra superior: empresa | tema, letra y usuario */}
      <header className="no-imprimir sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-stone-200 bg-superficie/95 px-3 shadow-[0_1px_0_rgb(15_44_80/0.06)] backdrop-blur sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="md:hidden">{logoSuperior}</span>
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
          <button onClick={() => setMenuAbierto(true)} aria-expanded={menuAbierto} aria-label="Menú"
            className="rounded-lg p-2 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-500 md:hidden">
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* Menú deslizable (celular): mismas secciones y mismo azul que la barra lateral */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="animar-aparecer absolute inset-0 bg-black/50" onClick={() => setMenuAbierto(false)} />
          <div className="fondo-lateral absolute inset-y-0 right-0 isolate flex w-72 max-w-[85vw] flex-col text-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-white/10 pl-4 pr-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/logo-blanco.png" alt="Grupo Otiniano" className="h-7 w-auto" />
              <button ref={cerrarRef} onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú"
                className={cx("rounded-lg p-2", FOCO_LATERAL, INACTIVO_LATERAL)}>
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

      <AvisoConexion compacto={compacto} />

      {/* Barra inferior (celular) */}
      <nav aria-label="Accesos rápidos" className="no-imprimir fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${barraInferior.length + 1}, minmax(0, 1fr))` }}>
          {barraInferior.map((i) => {
            const comprar = i.href === "/comprar";
            const activo = !comprar && actual?.item.href !== "/comprar" && moduloDe(i.href) === actual?.modulo.id;
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  prefetch
                  aria-current={activo ? "page" : undefined}
                  className={cx(
                    "relative flex flex-col items-center gap-0.5 py-2 text-xs font-medium",
                    comprar || activo ? "text-marca-700" : "text-stone-600",
                    // Indicador arriba del activo (no solo color)
                    activo && "before:absolute before:inset-x-5 before:top-0 before:h-[3px] before:rounded-b-full before:bg-marca-600",
                  )}
                >
                  {comprar ? (
                    <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-marca-500 to-marca-600 text-white shadow-lg ring-4 ring-superficie">
                      <i.icono className="size-6" />
                    </span>
                  ) : (
                    <i.icono className="size-5" />
                  )}
                  {i.texto}
                  <IndicadorNavegacion />
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMenuAbierto(true)}
              aria-expanded={menuAbierto}
              className="flex w-full flex-col items-center gap-0.5 py-2 text-xs font-medium text-stone-600"
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
