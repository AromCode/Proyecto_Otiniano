import { cx } from "./clases";

export function Tarjeta({ className, children }: { className?: string; children: React.ReactNode }) {
  // min-w-0: dentro de grids, un texto largo o una tabla no estiran la tarjeta (ni la página)
  return <section className={cx("min-w-0 rounded-xl border border-stone-200 bg-superficie shadow-sm", className)}>{children}</section>;
}

export function TituloTarjeta({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
      <h2 className="text-sm font-semibold text-stone-800">{children}</h2>
      {accion}
    </div>
  );
}

export function Encabezado({
  titulo, descripcion, acciones,
}: { titulo: string; descripcion?: React.ReactNode; acciones?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">{titulo}</h1>
        {descripcion && <p className="mt-0.5 text-sm text-stone-500">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

const tonos = {
  gris: "bg-stone-100 text-stone-700",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rojo: "bg-red-50 text-red-700 ring-red-600/20",
  ambar: "bg-amber-50 text-amber-800 ring-amber-600/20",
  marca: "bg-marca-50 text-marca-700 ring-marca-600/20",
  azul: "bg-sky-50 text-sky-700 ring-sky-600/20",
};
export type Tono = keyof typeof tonos;

export function Insignia({ tono = "gris", children }: { tono?: Tono; children: React.ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-stone-500/10", tonos[tono])}>
      {children}
    </span>
  );
}

export function PuntoMetal({ color }: { color?: string | null }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: color ?? "#a8a29e" }} />;
}

export function Vacio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="font-medium text-stone-700">{titulo}</p>
      {children && <div className="mt-1 text-sm text-stone-500">{children}</div>}
    </div>
  );
}

export function Kpi({
  titulo, valor, detalle, tono,
}: { titulo: string; valor: React.ReactNode; detalle?: React.ReactNode; tono?: "positivo" | "negativo" }) {
  return (
    <Tarjeta className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{titulo}</p>
      <p className={cx("cifra mt-1 text-[clamp(1.05rem,5.2vw,1.5rem)] font-semibold",
        tono === "positivo" && "text-emerald-700", tono === "negativo" && "text-red-700")}>{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-stone-500">{detalle}</p>}
    </Tarjeta>
  );
}

export function Aviso({ tono = "ambar", children }: { tono?: "ambar" | "rojo" | "verde" | "azul"; children: React.ReactNode }) {
  const t = {
    ambar: "border-amber-200 bg-amber-50 text-amber-900",
    rojo: "border-red-200 bg-red-50 text-red-800",
    verde: "border-emerald-200 bg-emerald-50 text-emerald-800",
    azul: "border-sky-200 bg-sky-50 text-sky-900",
  }[tono];
  return <div className={cx("rounded-lg border px-3 py-2 text-sm", t)}>{children}</div>;
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-stone-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm font-medium text-stone-900 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}
