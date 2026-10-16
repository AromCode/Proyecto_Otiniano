import clsx from "clsx";

export const cx = clsx;

export const claseInput =
  "block w-full min-w-0 rounded-lg border border-stone-300 bg-superficie px-3 py-2.5 text-base text-stone-900 " +
  "placeholder:text-stone-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-200 " +
  "disabled:bg-stone-100 disabled:text-stone-500 sm:text-sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-200 disabled:pointer-events-none disabled:opacity-50";

const variantes = {
  primario: "bg-marca-600 text-white hover:brightness-110 active:brightness-95",
  secundario: "border border-stone-300 bg-superficie text-stone-800 hover:bg-stone-50",
  peligro: "bg-red-600 text-white hover:brightness-110",
  fantasma: "text-stone-700 hover:bg-stone-200/60",
};
const tamanos = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-14 px-6 text-lg",
};

export type Variante = keyof typeof variantes;
export type Tamano = keyof typeof tamanos;

export function claseBoton(variante: Variante = "primario", tamano: Tamano = "md", extra?: string) {
  return clsx(base, variantes[variante], tamanos[tamano], extra);
}
