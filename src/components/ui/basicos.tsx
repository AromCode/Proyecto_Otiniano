import { cx } from "./clases";

export function Tarjeta({ className, children }: { className?: string; children: React.ReactNode }) {
  // min-w-0: dentro de grids, un texto largo o una tabla no estiran la tarjeta (ni la página)
  return <section className={cx("min-w-0 rounded-xl border border-stone-200 bg-superficie shadow-sm", className)}>{children}</section>;
}

export function TituloTarjeta({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
      <h2 className="text-[15px] font-semibold text-stone-900">{children}</h2>
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
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-stone-600">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

// Informativo = azul de marca (sky quedó para el módulo Compras). Estados verde/rojo/ámbar llevan un punto.
const tonos = {
  gris: "bg-stone-100 text-stone-600",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rojo: "bg-red-50 text-red-700 ring-red-600/20",
  ambar: "bg-amber-50 text-amber-800 ring-amber-600/20",
  marca: "bg-marca-50 text-marca-700 ring-marca-600/20",
  azul: "bg-marca-50 text-marca-700 ring-marca-600/20",
};
const CON_PUNTO = new Set<keyof typeof tonos>(["verde", "rojo", "ambar"]);
export type Tono = keyof typeof tonos;

export function Insignia({ tono = "gris", children }: { tono?: Tono; children: React.ReactNode }) {
  return (
    // Píldora (estado) a diferencia de los chips de módulo (rectángulo): el estado se reconoce también por la forma
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-stone-500/10", tonos[tono])}>
      {CON_PUNTO.has(tono) && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function PuntoMetal({ color }: { color?: string | null }) {
  // Contorno suave: los colores oscuros (fierro) no se pierden en modo oscuro
  return <span className="inline-block size-2.5 shrink-0 rounded-full ring-1 ring-stone-400/40" style={{ background: color ?? "#a8a29e" }} />;
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
    // Franja izquierda según el tono (colores que el modo oscuro no invierte)
    <Tarjeta className={cx("border-l-4 p-4",
      tono === "positivo" ? "border-l-emerald-600" : tono === "negativo" ? "border-l-red-600" : "border-l-marca-600")}>
      <p className="text-[13px] font-medium text-stone-600">{titulo}</p>
      <p className={cx("cifra mt-1 text-[clamp(1.25rem,5.5vw,1.75rem)] font-bold tracking-tight",
        tono === "positivo" && "text-emerald-700", tono === "negativo" && "text-red-700")}>{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-stone-600">{detalle}</p>}
    </Tarjeta>
  );
}

export function Aviso({ tono = "ambar", children }: { tono?: "ambar" | "rojo" | "verde" | "azul"; children: React.ReactNode }) {
  const t = {
    ambar: "border-amber-200 bg-amber-50 text-amber-900",
    rojo: "border-red-200 bg-red-50 text-red-800",
    verde: "border-emerald-200 bg-emerald-50 text-emerald-800",
    azul: "border-marca-200 bg-marca-50 text-marca-800",
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
