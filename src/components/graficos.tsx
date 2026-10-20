"use client";

import { useState } from "react";
import { nombrePeriodo, soles, kg } from "@/lib/formato";

const fmtCompacto = new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 });
const solesCorto = (v: number) => `${v < 0 ? "−" : ""}S/ ${fmtCompacto.format(Math.abs(v))}`;

/** Tope "redondo" del eje (1, 2, 2.5, 5 × 10ⁿ) para que las líneas guía tengan montos legibles */
function topeEje(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

/**
 * Utilidad por mes: una barra por mes (los meses sin movimiento van en cero, así la línea de
 * tiempo es continua y una sola barra no ocupa todo el ancho). Ganancia en color de marca,
 * pérdida en rojo, eje con montos y detalle al pasar el dedo o el mouse.
 */
export function GraficoUtilidad({ datos }: { datos: { periodo: string; utilidad: number; ventas: number; gastos: number }[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  if (!datos.some((d) => d.utilidad !== 0 || d.ventas !== 0 || d.gastos !== 0)) {
    return <p className="px-4 py-10 text-center text-sm text-stone-500">Aún no hay meses con movimientos en este rango.</p>;
  }

  const maxPos = Math.max(...datos.map((d) => d.utilidad), 0);
  const maxNeg = Math.max(...datos.map((d) => -d.utilidad), 0);
  const tope = topeEje(Math.max(maxPos, maxNeg));
  const arriba = maxPos > 0 ? tope : 0;
  const abajo = maxNeg > 0 ? tope : 0;
  const alto = 180;
  const escala = alto / (arriba + abajo);
  const cero = arriba * escala;
  const guias = [arriba, arriba / 2, 0, -abajo / 2, -abajo].filter((v, i, a) => a.indexOf(v) === i);
  const cadaEtiqueta = datos.length > 12 ? 2 : 1;
  const total = datos.reduce((a, d) => a + d.utilidad, 0);
  const d = activo !== null ? datos[activo] : null;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mb-2 min-h-10 text-sm">
        {d ? (
          <>
            <p className="font-medium">{nombrePeriodo(d.periodo)}</p>
            <p className="cifra text-stone-600">
              Utilidad <span className={`font-semibold ${d.utilidad < 0 ? "text-red-700" : "text-stone-900"}`}>{soles(d.utilidad)}</span>
              {" "}· Ventas {soles(d.ventas)} · Gastos {soles(d.gastos)}
            </p>
          </>
        ) : (
          <>
            <p className="cifra">
              Total {datos.length} meses: <span className={`font-semibold ${total < 0 ? "text-red-700" : "text-stone-900"}`}>{soles(total)}</span>
            </p>
            <p className="text-xs text-stone-500">Pase el dedo o el mouse por un mes para ver el detalle.</p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        {/* Eje vertical con montos */}
        <div className="relative w-14 shrink-0 text-right text-[10px] text-stone-500" style={{ height: alto }}>
          {guias.map((v) => (
            <span key={v} className="cifra absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ top: cero - v * escala }}>
              {v === 0 ? "0" : solesCorto(v)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: alto }}>
            {guias.map((v) => (
              <div key={v} className={`absolute inset-x-0 border-t ${v === 0 ? "border-stone-400" : "border-dashed border-stone-200"}`}
                style={{ top: cero - v * escala }} />
            ))}
            <div className="absolute inset-0 flex items-stretch">
              {datos.map((x, i) => {
                const h = x.utilidad === 0 ? 0 : Math.max(Math.abs(x.utilidad) * escala, 2);
                const positivo = x.utilidad >= 0;
                return (
                  <button
                    key={x.periodo}
                    type="button"
                    className={`relative flex flex-1 justify-center rounded focus:outline-none ${activo === i ? "bg-stone-100" : ""}`}
                    onMouseEnter={() => setActivo(i)}
                    onMouseLeave={() => setActivo(null)}
                    onFocus={() => setActivo(i)}
                    onBlur={() => setActivo(null)}
                    onClick={() => setActivo(i)}
                    aria-label={`${nombrePeriodo(x.periodo)}: ${soles(x.utilidad)}`}
                  >
                    <span
                      className={`absolute w-[60%] max-w-7 ${positivo ? "rounded-t bg-marca-500" : "rounded-b bg-red-400"}`}
                      style={positivo ? { bottom: alto - cero, height: h } : { top: cero, height: h }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-1 flex">
            {datos.map((x, i) => (
              <span key={x.periodo} className="flex-1 truncate text-center text-[10px] text-stone-500">
                {(datos.length - 1 - i) % cadaEtiqueta === 0 ? `${nombrePeriodo(x.periodo).slice(0, 3)} ${x.periodo.slice(2, 4)}` : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-marca-500" /> Ganancia</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red-400" /> Pérdida</span>
        <span className="text-stone-500">Utilidad = ventas − costo de lo vendido − mermas − gastos</span>
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
