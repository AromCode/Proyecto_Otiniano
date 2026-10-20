"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserRound } from "lucide-react";
import { ETIQUETA_ROL } from "@/lib/formato";
import type { Rol } from "@/lib/tipos";
import { cx } from "@/components/ui/clases";
import { BotonLetra, BotonTema, type Preferencias } from "@/components/preferencias/preferencias";
import { BotonCerrarSesion } from "./cerrar-sesion";
import { IndicadorNavegacion } from "./indicador-navegacion";

const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

/** Usuario en la barra superior: abre Mi cuenta y Cerrar sesión (en celular, también tema y letra) */
export function MenuUsuario({ nombre, rol, p }: { nombre: string; rol: Rol; p: Preferencias }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierto]);

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 hover:bg-stone-100 sm:pr-2"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marca-600 text-xs font-bold text-white">
          {iniciales(nombre)}
        </span>
        <span className="hidden min-w-0 text-left leading-tight lg:block">
          <span className="block max-w-44 truncate text-sm font-medium">Bienvenido, {nombre}</span>
          <span className="block text-xs text-stone-500">{ETIQUETA_ROL[rol]}</span>
        </span>
        <ChevronDown className={cx("hidden size-4 text-stone-400 transition-transform sm:block", abierto && "rotate-180")} />
      </button>

      {abierto && (
        <div role="menu" className="animar-aparecer absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-stone-200 bg-superficie p-1.5 shadow-lg">
          <div className="border-b border-stone-100 px-2.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold">{nombre}</p>
            <p className="text-xs text-stone-500">{ETIQUETA_ROL[rol]}</p>
          </div>
          <div className="py-1">
            <Link
              href="/cuenta"
              prefetch
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              <UserRound className="size-[18px]" /> Mi cuenta
              <IndicadorNavegacion />
            </Link>
            {/* En celular la barra superior no tiene espacio para estos dos botones */}
            <div className="sm:hidden">
              <BotonTema p={p} conTexto />
              <BotonLetra p={p} conTexto />
            </div>
          </div>
          <div className="border-t border-stone-100 pt-1">
            <BotonCerrarSesion
              nombre={nombre}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-stone-700 hover:bg-red-50 hover:text-red-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}
