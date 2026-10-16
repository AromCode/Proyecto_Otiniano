"use client";

import { useState } from "react";
import { Moon, MonitorSmartphone, Sun, Type } from "lucide-react";
import { COOKIE_LETRA, COOKIE_TEMA, type Letra, type Tema } from "@/lib/preferencias";
import { cx } from "@/components/ui/clases";

function guardar(nombre: string, valor: string) {
  document.cookie = `${nombre}=${valor}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function aplicarTema(t: Tema) {
  const html = document.documentElement;
  html.classList.remove("claro", "oscuro");
  if (t !== "auto") html.classList.add(t);
  guardar(COOKIE_TEMA, t);
}

function aplicarLetra(l: Letra) {
  document.documentElement.classList.toggle("letra-grande", l === "grande");
  guardar(COOKIE_LETRA, l);
}

const TEMAS: { valor: Tema; texto: string; icono: typeof Sun }[] = [
  { valor: "claro", texto: "Claro", icono: Sun },
  { valor: "oscuro", texto: "Oscuro", icono: Moon },
  { valor: "auto", texto: "Automático", icono: MonitorSmartphone },
];

function Segmentado<T extends string>({
  opciones, valor, onCambio,
}: { opciones: { valor: T; texto: string; icono: typeof Sun }[]; valor: T; onCambio: (v: T) => void }) {
  return (
    <div className="grid gap-1 rounded-xl bg-stone-100 p-1" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambio(o.valor)}
          aria-pressed={valor === o.valor}
          className={cx(
            "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium",
            valor === o.valor ? "bg-superficie text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800",
          )}
        >
          <o.icono className="size-4 shrink-0" />
          <span className="truncate">{o.texto}</span>
        </button>
      ))}
    </div>
  );
}

/** Panel completo (página Mi cuenta) */
export function PanelPreferencias({ tema: temaInicial, letra: letraInicial }: { tema: Tema; letra: Letra }) {
  const [tema, setTema] = useState(temaInicial);
  const [letra, setLetra] = useState(letraInicial);
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-stone-700">Tema</p>
        <Segmentado opciones={TEMAS} valor={tema} onCambio={(t) => { setTema(t); aplicarTema(t); }} />
        <p className="mt-1 text-xs text-stone-500">Automático sigue la configuración del celular o la computadora.</p>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-stone-700">Tamaño de letra</p>
        <Segmentado
          opciones={[{ valor: "normal" as Letra, texto: "Normal", icono: Type }, { valor: "grande" as Letra, texto: "Grande", icono: Type }]}
          valor={letra}
          onCambio={(l) => { setLetra(l); aplicarLetra(l); }}
        />
        <p className="mt-1 text-xs text-stone-500">Se guarda en este dispositivo.</p>
      </div>
    </div>
  );
}

/** Botones rápidos para el pie del menú */
export function AccesosPreferencias({ tema: temaInicial, letra: letraInicial }: { tema: Tema; letra: Letra }) {
  const [tema, setTema] = useState(temaInicial);
  const [letra, setLetra] = useState(letraInicial);
  const siguiente: Record<Tema, Tema> = { auto: "claro", claro: "oscuro", oscuro: "auto" };
  const Icono = TEMAS.find((t) => t.valor === tema)!.icono;
  const boton = "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100";
  return (
    <div className="mb-2 flex gap-1">
      <button
        type="button"
        className={boton}
        title="Cambiar tema"
        onClick={() => { const t = siguiente[tema]; setTema(t); aplicarTema(t); }}
      >
        <Icono className="size-4" /> {TEMAS.find((t) => t.valor === tema)!.texto}
      </button>
      <button
        type="button"
        className={cx(boton, letra === "grande" && "bg-stone-100 text-stone-900")}
        title="Letra grande"
        aria-pressed={letra === "grande"}
        onClick={() => { const l = letra === "grande" ? "normal" : "grande"; setLetra(l); aplicarLetra(l); }}
      >
        <Type className="size-4" /> Letra {letra === "grande" ? "grande" : "normal"}
      </button>
    </div>
  );
}
