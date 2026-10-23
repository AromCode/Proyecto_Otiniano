"use client";

import { useMemo, useState } from "react";
import { ChevronRight, CornerDownRight, Search, X } from "lucide-react";
import { PuntoMetal } from "@/components/ui/basicos";
import { claseInput, cx } from "@/components/ui/clases";
import { soles } from "@/lib/formato";
import type { ClaseProveedor, Producto } from "@/lib/tipos";

/** Precio de compra sugerido según el tipo de proveedor (el mayorista cobra su propio precio) */
export function precioSugerido(p: Pick<Producto, "precio_compra" | "precio_mayorista">, clase: ClaseProveedor | null | undefined) {
  return clase === "mayorista" && p.precio_mayorista != null ? p.precio_mayorista : p.precio_compra;
}

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Elige un producto de la jerarquía: se navega familia → producto → variante con botones grandes
 * (pensado para el celular del almacén) o se busca por nombre o código.
 */
export function SelectorProducto({
  productos, onElegir, precio, extra,
}: {
  productos: Producto[];
  onElegir: (p: Producto) => void;
  /** Texto de precio bajo cada botón (por defecto, el de compra) */
  precio?: (p: Producto) => string;
  /** Dato extra bajo cada botón (p. ej. stock) */
  extra?: (p: Producto) => React.ReactNode;
}) {
  const [padre, setPadre] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const hijosDe = (id: string | null) => productos.filter((p) => (p.padre_id ?? null) === id
    // si el padre no está en la lista (inactivo), el hijo se muestra arriba
    || (id === null && p.padre_id !== null && !porId.has(p.padre_id)));
  const actual = padre ? porId.get(padre) ?? null : null;

  const texto = normal(q.trim());
  const lista = texto
    ? productos.filter((p) => normal(p.ruta).includes(texto) || normal(p.codigo ?? "").startsWith(texto)).slice(0, 30)
    : hijosDe(padre);
  const etiquetaPrecio = precio ?? ((p: Producto) => `${soles(p.precio_compra)}/kg`);

  function tocar(p: Producto) {
    if (!texto && p.tiene_hijos && productos.some((h) => h.padre_id === p.id)) setPadre(p.id);
    else {
      onElegir(p);
      setQ("");
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 size-4 text-stone-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto o código"
          className={cx(claseInput, "pl-9")} inputMode="search" />
        {q && (
          <button type="button" onClick={() => setQ("")} className="absolute right-2 top-2 rounded p-1 text-stone-400 hover:text-stone-700" aria-label="Limpiar">
            <X className="size-4" />
          </button>
        )}
      </div>

      {!texto && actual && (
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={() => setPadre(null)} className="font-medium text-marca-700 hover:underline">Todos</button>
          {actual.ruta.split(" › ").map((parte, i, arr) => {
            // id de cada ancestro: se sube por padre_id
            let nodo: Producto | undefined = actual;
            for (let k = arr.length - 1; k > i && nodo; k--) nodo = nodo.padre_id ? porId.get(nodo.padre_id) : undefined;
            return (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="size-3.5 text-stone-400" />
                {i < arr.length - 1 && nodo
                  ? <button type="button" onClick={() => setPadre(nodo!.id)} className="font-medium text-marca-700 hover:underline">{parte}</button>
                  : <span className="font-semibold">{parte}</span>}
              </span>
            );
          })}
        </nav>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {!texto && actual && (
          <button type="button" onClick={() => onElegir(actual)}
            className="flex min-h-14 items-center gap-2 rounded-xl border border-dashed border-marca-300 bg-marca-50 px-3 py-2 text-left active:scale-[0.98]">
            <CornerDownRight className="size-4 shrink-0 text-marca-700" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{actual.nombre} (general)</span>
              <span className="cifra block text-xs text-stone-500">{etiquetaPrecio(actual)}</span>
            </span>
          </button>
        )}
        {lista.map((p) => {
          const conHijos = !texto && p.tiene_hijos && productos.some((h) => h.padre_id === p.id);
          return (
            <button key={p.id} type="button" onClick={() => tocar(p)}
              className="flex min-h-14 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-left active:scale-[0.98] active:bg-marca-50">
              <PuntoMetal color={p.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{texto ? p.ruta : p.nombre}</span>
                <span className="cifra block truncate text-xs text-stone-500">
                  {p.codigo && <span className="mr-1 font-mono">{p.codigo}</span>}
                  {conHijos ? `${productos.filter((h) => h.padre_id === p.id).length} variantes` : etiquetaPrecio(p)}
                </span>
                {extra && <span className="block truncate text-xs">{extra(p)}</span>}
              </span>
              {conHijos && <ChevronRight className="size-4 shrink-0 text-stone-400" />}
            </button>
          );
        })}
      </div>
      {lista.length === 0 && <p className="py-3 text-center text-sm text-stone-500">Sin productos que coincidan.</p>}
    </div>
  );
}

/** Opciones de un <select> con la ruta completa del producto (para elegir destino o filtrar) */
export function OpcionesProducto({ productos, excluir }: { productos: Producto[]; excluir?: string }) {
  return (
    <>
      {productos.filter((p) => p.id !== excluir).map((p) => (
        <option key={p.id} value={p.id}>{"  ".repeat(p.nivel - 1)}{p.nivel > 1 ? "└ " : ""}{p.nombre}{p.codigo ? ` · ${p.codigo}` : ""}</option>
      ))}
    </>
  );
}
