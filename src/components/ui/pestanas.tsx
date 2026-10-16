import Link from "next/link";
import { cx } from "./clases";

/** Pestañas por enlace (?tab=...): funcionan sin JavaScript y se pueden compartir. */
export function Pestanas({ base, actual, opciones }: {
  base: string;
  actual: string;
  opciones: { valor: string; texto: string; cantidad?: number }[];
}) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-stone-200/60 p-1">
      {opciones.map((o, i) => (
        <Link
          key={o.valor}
          href={i === 0 ? base : `${base}?tab=${o.valor}`}
          scroll={false}
          className={cx(
            "flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
            actual === o.valor ? "bg-superficie text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900",
          )}
        >
          {o.texto}
          {o.cantidad !== undefined && (
            <span className="rounded-full bg-stone-100 px-1.5 text-xs text-stone-600">{o.cantidad}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
