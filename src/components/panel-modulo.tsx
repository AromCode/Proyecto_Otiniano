import Link from "next/link";
import { cx } from "@/components/ui/clases";

// Panel destacado arriba de cada módulo, con la misma idea que "Patrimonio · hoy" del inicio: fondo del color
// del módulo, la cifra principal grande a la izquierda y las secundarias al lado. Así el resumen no se confunde
// con el historial (tarjetas blancas de abajo). Colores fijos: se ve igual en modo claro y oscuro.

// Degradados de la familia de azules de los módulos (ver TONOS), oscuros para que el blanco pase AA.
const FONDOS = {
  compras: "from-[#075985] via-[#0b4f7a] to-[#0c3d5e]",
  ventas: "from-[#343d96] via-[#2c3380] to-[#1f2560]",
  contactos: "from-[#164e63] via-[#134e63] to-[#0f3a4d]",
  inventario: "from-[#2f4f70] via-[#283f5a] to-[#1e3045]",
  caja: "from-[#1e40af] via-[#1e3a8a] to-[#172e6e]",
} as const;

export interface CeldaPanel {
  titulo: string;
  valor: React.ReactNode;
  detalle?: React.ReactNode;
  href?: string;
  /** Resaltada (p. ej. la caja filtrada) */
  activa?: boolean;
  negativo?: boolean;
}

function Celda({ c, principal }: { c: CeldaPanel; principal?: boolean }) {
  const contenido = (
    <>
      <p className="truncate text-xs font-medium uppercase tracking-wide text-white/90">{c.titulo}</p>
      <p className={cx(
        "cifra mt-1 truncate font-bold tracking-tight",
        principal ? "text-[clamp(1.5rem,7vw,2.25rem)] leading-tight" : "text-[clamp(1.05rem,4.8vw,1.4rem)]",
        c.negativo && "text-red-100",
      )}>{c.valor}</p>
      {c.detalle && <p className="mt-0.5 truncate text-xs text-white/90">{c.detalle}</p>}
    </>
  );
  const clase = cx(
    "block min-w-0 rounded-xl px-3 py-3 sm:px-4",
    principal && "bg-white/15 py-4 ring-1 ring-white/25 sm:py-5",
    !principal && c.activa && "bg-white/15 ring-1 ring-white/40",
    c.href && "transition-colors hover:bg-white/10",
  );
  return c.href ? <Link href={c.href} className={clase}>{contenido}</Link> : <div className={clase}>{contenido}</div>;
}

export function PanelModulo({ tono, etiqueta, insignia, principal, celdas }: {
  tono: keyof typeof FONDOS;
  /** Qué muestra el panel, p. ej. "Octubre de 2026" */
  etiqueta: React.ReactNode;
  /** Píldora a la derecha del encabezado (variación, margen…) */
  insignia?: React.ReactNode;
  principal: CeldaPanel;
  celdas: CeldaPanel[];
}) {
  return (
    <section className={cx("relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-lg", FONDOS[tono])}>
      {/* Brillo cian como la barra lateral, más el círculo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_140px_at_0_0,rgb(34_192_248/0.15),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10" />
      <div className="relative flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90">{etiqueta}</h2>
        {insignia && <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{insignia}</span>}
      </div>
      <div className={cx("relative grid gap-2 p-2", celdas.length > 0 && "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] lg:items-center")}>
        <Celda c={principal} principal />
        {celdas.length > 0 && (
          // En celular (2 columnas) la última celda suelta ocupa todo el ancho: nombres largos no se cortan
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
            {celdas.map((c) => <Celda key={c.titulo} c={c} />)}
          </div>
        )}
      </div>
    </section>
  );
}

/** Título de bloque debajo del panel (p. ej. "Historial de compras"), para separar resumen y lista */
export function TituloSeccion({ titulo, detalle }: { titulo: string; detalle?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
      <h2 className="text-base font-semibold text-stone-800">{titulo}</h2>
      {detalle && <p className="text-xs text-stone-500">{detalle}</p>}
    </div>
  );
}
