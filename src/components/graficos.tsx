"use client";

import { useState } from "react";
import { nombrePeriodo, soles, kg } from "@/lib/formato";

/**
 * Utilidad por mes: barras verticales de una sola serie (sin leyenda; el título la nombra).
 * Positivo en color de marca, negativo en rojo apagado, línea base en cero, tooltip al pasar.
 */
export function GraficoUtilidad({ datos }: { datos: { periodo: string; utilidad: number; ventas: number; gastos: number }[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  if (datos.length === 0) return <p className="px-4 py-10 text-center text-sm text-stone-500">Aún no hay meses con movimientos.</p>;

  const max = Math.max(...datos.map((d) => Math.abs(d.utilidad)), 1);
  const hayNegativos = datos.some((d) => d.utilidad < 0);
  const alto = 180;
  const cero = hayNegativos ? alto / 2 : alto;
  const escala = (hayNegativos ? alto / 2 : alto) / max;
  const d = activo !== null ? datos[activo] : null;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mb-2 h-10 text-sm">
        {d ? (
          <>
            <p className="font-medium">{nombrePeriodo(d.periodo)}</p>
            <p className="cifra text-stone-600">
              Utilidad <span className="font-semibold text-stone-900">{soles(d.utilidad)}</span> · Ventas {soles(d.ventas)} · Gastos {soles(d.gastos)}
            </p>
          </>
        ) : <p className="text-stone-500">Pase el dedo o el mouse por una barra para ver el detalle.</p>}
      </div>
      <div className="relative" style={{ height: alto }}>
        {/* Línea base */}
        <div className="absolute inset-x-0 border-t border-stone-300" style={{ top: cero }} />
        <div className="absolute inset-0 flex items-stretch gap-[2px]">
          {datos.map((x, i) => {
            const h = Math.max(Math.abs(x.utilidad) * escala, x.utilidad === 0 ? 0 : 2);
            const positivo = x.utilidad >= 0;
            return (
              <button
                key={x.periodo}
                type="button"
                className="relative flex-1 focus:outline-none"
                onMouseEnter={() => setActivo(i)}
                onMouseLeave={() => setActivo(null)}
                onFocus={() => setActivo(i)}
                onClick={() => setActivo(i)}
                aria-label={`${nombrePeriodo(x.periodo)}: ${soles(x.utilidad)}`}
              >
                <span
                  className={`absolute inset-x-[15%] ${positivo ? "rounded-t" : "rounded-b"} ${positivo ? "bg-marca-500" : "bg-red-400"} ${activo === i ? "opacity-100" : activo === null ? "opacity-90" : "opacity-50"}`}
                  style={positivo ? { bottom: alto - cero, height: h } : { top: cero, height: h }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-[2px]">
        {datos.map((x) => (
          <span key={x.periodo} className="flex-1 truncate text-center text-[10px] text-stone-500">
            {nombrePeriodo(x.periodo).slice(0, 3)} {x.periodo.slice(2, 4)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Stock por metal: barras horizontales con etiqueta directa (nombre y kg), no depende del color. */
export function GraficoStock({ datos }: { datos: { nombre: string; color: string | null; kg: number; valor: number }[] }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  if (datos.length === 0) return <p className="px-4 py-10 text-center text-sm text-stone-500">Sin stock.</p>;
  return (
    <ul className="space-y-3 px-4 py-4">
      {datos.map((d) => (
        <li key={d.nombre} title={`${d.nombre}: ${kg(d.kg)} · ${soles(d.valor)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{d.nombre}</span>
            <span className="cifra text-xs text-stone-600">{kg(d.kg)} · {soles(d.valor)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-stone-100">
            <div className="h-full rounded-full" style={{ width: `${Math.max((d.valor / max) * 100, 1)}%`, background: d.color ?? "#a8a29e" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
