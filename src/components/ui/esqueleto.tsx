import { Tarjeta } from "./basicos";
import { cx } from "./clases";

/**
 * Bloques grises animados mientras carga una sección (loading.tsx y <Suspense>).
 * Usan stone-200, que el modo oscuro ya redefine.
 */
export function Esqueleto({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cx("animate-pulse rounded-md bg-stone-200", className)} style={style} />;
}

export function EsqueletoEncabezado({ acciones = true }: { acciones?: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <Esqueleto className="h-3.5 w-24" />
        <Esqueleto className="h-7 w-52 sm:h-8" />
      </div>
      {acciones && (
        <div className="hidden gap-2 sm:flex">
          <Esqueleto className="h-10 w-28 rounded-lg" />
          <Esqueleto className="h-10 w-28 rounded-lg" />
        </div>
      )}
    </div>
  );
}

export function EsqueletoKpis({ n = 4 }: { n?: number }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <Tarjeta key={i} className="space-y-2.5 p-4">
          <Esqueleto className="h-3 w-24" />
          <Esqueleto className="h-6 w-32" />
          <Esqueleto className="h-3 w-20" />
        </Tarjeta>
      ))}
    </div>
  );
}

export function EsqueletoTabla({ filas = 6, className }: { filas?: number; className?: string }) {
  return (
    <Tarjeta className={className}>
      <div className="border-b border-stone-100 px-4 py-3"><Esqueleto className="h-4 w-36" /></div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Esqueleto className="h-4 w-1/4" />
            <Esqueleto className="hidden h-4 w-1/5 sm:block" />
            <Esqueleto className="h-4 flex-1" />
            <Esqueleto className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Tarjeta>
  );
}

export function EsqueletoGrafico({ className, alto = 180 }: { className?: string; alto?: number }) {
  return (
    <Tarjeta className={className}>
      <div className="border-b border-stone-100 px-4 py-3"><Esqueleto className="h-4 w-32" /></div>
      <div className="px-4 pb-4 pt-3">
        <Esqueleto className="mb-3 h-3.5 w-48" />
        <div className="flex items-end gap-2" style={{ height: alto }}>
          {[40, 65, 30, 80, 55, 70, 45, 90, 60, 35, 75, 50].map((h, i) => (
            <Esqueleto key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </Tarjeta>
  );
}

export function EsqueletoFormulario({ campos = 5 }: { campos?: number }) {
  return (
    <Tarjeta className="space-y-4 p-4 sm:p-6">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <Esqueleto className="h-3 w-28" />
          <Esqueleto className="h-11 w-full rounded-lg" />
        </div>
      ))}
      <Esqueleto className="h-14 w-full rounded-lg" />
    </Tarjeta>
  );
}

/** Forma de PanelModulo (panel de color con la cifra principal grande) */
export function EsqueletoPanel({ celdas = 3 }: { celdas?: number }) {
  return (
    <div className="mb-8 rounded-2xl border border-stone-200 bg-stone-100 p-2">
      <Esqueleto className="mx-3 mb-2 mt-2 h-3 w-36" />
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] lg:items-center">
        <div className="space-y-2.5 rounded-xl bg-superficie px-4 py-5">
          <Esqueleto className="h-3 w-28" />
          <Esqueleto className="h-9 w-48" />
          <Esqueleto className="h-3 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {Array.from({ length: celdas }, (_, i) => (
            <div key={i} className="space-y-2 px-4 py-3">
              <Esqueleto className="h-3 w-20" />
              <Esqueleto className="h-6 w-28" />
              <Esqueleto className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Módulo con panel destacado (compras, ventas, inventario, caja, capital) */
export function EsqueletoPaginaPanel() {
  return (
    <div role="status" aria-label="Cargando">
      <EsqueletoEncabezado />
      <EsqueletoPanel />
      <Esqueleto className="mb-3 h-4 w-40" />
      <EsqueletoTabla />
    </div>
  );
}

/** Página genérica de módulo: título, resumen, filtros y tabla */
export function EsqueletoPagina() {
  return (
    <div role="status" aria-label="Cargando">
      <EsqueletoEncabezado />
      <EsqueletoKpis />
      <EsqueletoTabla />
    </div>
  );
}
