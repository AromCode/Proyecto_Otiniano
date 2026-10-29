"use client";

import { useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { cx } from "@/components/ui/clases";
import { kg, nombrePeriodo, soles } from "@/lib/formato";

// Gráficos del inicio y del historial por metal (recharts). Los números llegan calculados
// desde la BD (dashboard_serie, dashboard_rango, resumen_metal); aquí solo se dibujan.
// Colores por variables CSS para que funcionen en modo claro y oscuro.

const C = {
  compras: "var(--color-sky-600)",
  ventas: "var(--color-anil-600)",
  utilidad: "var(--color-marca-600)",
  perdida: "var(--color-red-500)",
  texto: "var(--color-stone-500)",
  grilla: "var(--color-stone-200)",
};
const compacto = new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 });
const solesCorto = (v: number) => `S/ ${compacto.format(v)}`;
const mesCorto = (p: string) => {
  const [a, m] = p.split("-").map(Number);
  const t = new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(a, m - 1, 15)));
  return `${t.replace(".", "")} ${String(a).slice(2)}`;
};
const diaCorto = (d: string) => {
  const [, m, dd] = d.split("-");
  return `${dd}/${m}`;
};

const ejes = {
  tick: { fill: C.texto, fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;
const estiloTooltip = {
  contentStyle: {
    background: "var(--color-superficie)", border: "1px solid var(--color-stone-200)", borderRadius: 10,
    fontSize: 12, color: "var(--color-stone-900)", boxShadow: "0 4px 14px rgb(0 0 0 / 0.12)",
  },
  labelStyle: { fontWeight: 600, marginBottom: 4, color: "var(--color-stone-900)" },
  // Recharts pinta cada línea con el color de la serie (p. ej. Fierro gris oscuro): en modo oscuro no se leía.
  // El texto va siempre en el color del tema; el color de la serie ya se ve en el gráfico y en la leyenda.
  itemStyle: { color: "var(--color-stone-800)", padding: "1px 0" },
  cursor: { fill: "var(--color-stone-100)", opacity: 0.6 },
  // Separado del puntero para no tapar la barra o el punto que se está mirando
  offset: 16,
  wrapperStyle: { outline: "none", zIndex: 10 },
} as const;

function Vacio({ texto }: { texto: string }) {
  return <p className="flex h-full min-h-40 items-center justify-center px-4 text-center text-sm text-stone-500">{texto}</p>;
}

// -----------------------------------------------------------------------------
// Barras por mes: compras, ventas y utilidad
// -----------------------------------------------------------------------------
export interface FilaMes { periodo: string; compras: number; ventas: number; utilidad: number; gastos?: number; merma?: number }

export function GraficoMensual({ datos }: { datos: FilaMes[] }) {
  const [series, setSeries] = useState({ compras: true, ventas: true, utilidad: true });
  if (!datos.length || datos.every((d) => !d.compras && !d.ventas && !d.utilidad)) {
    return <Vacio texto="Sin movimiento en los meses elegidos." />;
  }
  const filas = datos.map((d) => ({ ...d, etiqueta: mesCorto(d.periodo) }));
  const botones = [
    { k: "compras" as const, texto: "Compras", color: C.compras },
    { k: "ventas" as const, texto: "Ventas", color: C.ventas },
    { k: "utilidad" as const, texto: "Utilidad", color: C.utilidad },
  ];
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Series">
        {botones.map((b) => (
          <button key={b.k} type="button" aria-pressed={series[b.k]}
            onClick={() => setSeries((s) => ({ ...s, [b.k]: !s[b.k] }))}
            className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              series[b.k] ? "border-stone-300 bg-superficie text-stone-800" : "border-transparent bg-stone-100 text-stone-500 line-through")}>
            <span className="size-2.5 rounded-sm" style={{ background: b.color }} /> {b.texto}
          </button>
        ))}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={C.grilla} />
            <XAxis dataKey="etiqueta" {...ejes} interval="preserveStartEnd" minTickGap={8} />
            <YAxis {...ejes} width={64} tickFormatter={solesCorto} />
            <ReferenceLine y={0} stroke="var(--color-stone-400)" />
            <Tooltip {...estiloTooltip}
              labelFormatter={(_, p) => (p?.[0]?.payload ? nombrePeriodo(p[0].payload.periodo) : "")}
              formatter={(v: number, n: string) => [soles(v), n]} />
            {series.compras && <Bar dataKey="compras" name="Compras" fill={C.compras} radius={[3, 3, 0, 0]} maxBarSize={22} />}
            {series.ventas && <Bar dataKey="ventas" name="Ventas" fill={C.ventas} radius={[3, 3, 0, 0]} maxBarSize={22} />}
            {series.utilidad && (
              <Bar dataKey="utilidad" name="Utilidad" radius={[3, 3, 0, 0]} maxBarSize={22}>
                {filas.map((f) => <Cell key={f.periodo} fill={f.utilidad < 0 ? C.perdida : C.utilidad} />)}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Torta por metal (dona con total al centro)
// -----------------------------------------------------------------------------
export interface FilaMetal { nombre: string; color: string | null; compras: number; ventas: number; kg_comprado: number; kg_vendido: number }
type Medida = "ventas" | "compras" | "kg_comprado" | "kg_vendido";
const MEDIDAS: { k: Medida; texto: string; kg: boolean }[] = [
  { k: "ventas", texto: "Ventas S/", kg: false },
  { k: "compras", texto: "Compras S/", kg: false },
  { k: "kg_vendido", texto: "Kg vendidos", kg: true },
  { k: "kg_comprado", texto: "Kg comprados", kg: true },
];
const RESPALDO = ["#1a5ca8", "#0d9488", "#4f46e5", "#b8862e", "#9ca3af", "#57534e", "#c026d3", "#0284c7"];

export function TortaPorMetal({ datos }: { datos: FilaMetal[] }) {
  const [medida, setMedida] = useState<Medida>(() => (datos.some((d) => d.ventas > 0) ? "ventas" : "compras"));
  // Producto señalado (dona o leyenda): se muestra en el centro en lugar de un recuadro flotante que tape el total
  const [activo, setActivo] = useState<number | null>(null);
  const def = MEDIDAS.find((m) => m.k === medida)!;
  const filas = datos.map((d, i) => ({ nombre: d.nombre, color: d.color ?? RESPALDO[i % RESPALDO.length], valor: Number(d[medida]) || 0 }))
    .filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor);
  const total = filas.reduce((s, f) => s + f.valor, 0);
  const fmt = (v: number) => (def.kg ? kg(v) : soles(v));
  const sel = activo !== null ? filas[activo] : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label="Medida">
        {MEDIDAS.map((m) => (
          <button key={m.k} type="button" onClick={() => { setMedida(m.k); setActivo(null); }} aria-pressed={medida === m.k}
            className={cx("rounded-md px-2 py-1 text-xs font-medium",
              medida === m.k ? "bg-stone-800 text-stone-50" : "text-stone-600 hover:bg-stone-100")}>
            {m.texto}
          </button>
        ))}
      </div>
      {!filas.length ? <Vacio texto="Sin datos en este periodo." /> : (
        <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={filas} dataKey="valor" nameKey="nombre" innerRadius="58%" outerRadius="92%" paddingAngle={filas.length > 1 ? 2 : 0} stroke="none"
                  onMouseEnter={(_, i) => setActivo(i)} onMouseLeave={() => setActivo(null)}>
                  {filas.map((f, i) => (
                    <Cell key={f.nombre} fill={f.color} fillOpacity={activo === null || activo === i ? 1 : 0.35}
                      className="cursor-pointer transition-[fill-opacity] duration-150 outline-none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div aria-live="polite" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[22%] text-center">
              {sel ? (
                <>
                  <span className="max-w-full truncate text-[11px] font-medium uppercase tracking-wide text-stone-600">{sel.nombre}</span>
                  <span className="cifra text-sm font-semibold">{fmt(sel.valor)}</span>
                  <span className="cifra text-xs text-stone-500">{((sel.valor / total) * 100).toFixed(1)} %</span>
                </>
              ) : (
                <>
                  <span className="text-[11px] uppercase tracking-wide text-stone-500">Total</span>
                  <span className="cifra text-sm font-semibold">{fmt(total)}</span>
                </>
              )}
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            {filas.map((f, i) => (
              <li key={f.nombre} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)}
                className={cx("-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors", activo === i && "bg-stone-100")}>
                <span className="size-2.5 shrink-0 rounded-full ring-1 ring-stone-400/40" style={{ background: f.color }} />
                <span className="min-w-0 flex-1 truncate">{f.nombre}</span>
                <span className="cifra text-xs text-stone-500">{((f.valor / total) * 100).toFixed(1)} %</span>
                <span className="cifra w-28 text-right text-xs font-medium">{fmt(f.valor)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Curva S: acumulado día a día de ventas, compras y utilidad
// -----------------------------------------------------------------------------
export interface FilaDia { dia: string; compras_acum: number; ventas_acum: number; utilidad_acum: number }

export function CurvaS({ datos }: { datos: FilaDia[] }) {
  if (!datos.length || datos.every((d) => !d.compras_acum && !d.ventas_acum && !d.utilidad_acum)) {
    return <Vacio texto="Sin movimiento en el rango elegido." />;
  }
  const ultimo = datos.at(-1)!;
  return (
    <div>
      <div className="mb-2 grid grid-cols-3 gap-2 text-xs">
        {[
          { t: "Ventas acumuladas", v: ultimo.ventas_acum, c: C.ventas },
          { t: "Compras acumuladas", v: ultimo.compras_acum, c: C.compras },
          { t: "Utilidad acumulada", v: ultimo.utilidad_acum, c: ultimo.utilidad_acum < 0 ? C.perdida : C.utilidad },
        ].map((x) => (
          <div key={x.t} className="min-w-0 rounded-lg bg-stone-50 px-2.5 py-1.5">
            <p className="flex items-center gap-1.5 truncate text-stone-500"><span className="size-2 shrink-0 rounded-full" style={{ background: x.c }} />{x.t}</p>
            <p className="cifra truncate text-sm font-semibold">{soles(x.v)}</p>
          </div>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datos} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              {(["ventas", "compras", "utilidad"] as const).map((k) => (
                <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C[k]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={C[k]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={C.grilla} />
            <XAxis dataKey="dia" {...ejes} tickFormatter={diaCorto} minTickGap={28} />
            <YAxis {...ejes} width={64} tickFormatter={solesCorto} />
            <Tooltip {...estiloTooltip} cursor={{ stroke: "var(--color-stone-400)" }}
              labelFormatter={(d: string) => new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))}
              formatter={(v: number, n: string) => [soles(v), n]} />
            <Area type="monotone" dataKey="ventas_acum" name="Ventas" stroke={C.ventas} strokeWidth={2} fill="url(#g-ventas)" dot={false} />
            <Area type="monotone" dataKey="compras_acum" name="Compras" stroke={C.compras} strokeWidth={2} fill="url(#g-compras)" dot={false} />
            <Area type="monotone" dataKey="utilidad_acum" name="Utilidad" stroke={C.utilidad} strokeWidth={2.5} fill="url(#g-utilidad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Historial de un metal: kilos comprados vs. vendidos por mes y precios promedio
// -----------------------------------------------------------------------------
export interface FilaMetalMes {
  periodo: string; kg_comprado: number; kg_vendido: number; precio_compra: number | null; precio_venta: number | null;
}

export function GraficoHistorialMetal({ datos }: { datos: FilaMetalMes[] }) {
  if (!datos.length) return <Vacio texto="Sin compras ni ventas de este producto en el periodo." />;
  const filas = datos.map((d) => ({ ...d, etiqueta: mesCorto(d.periodo) }));
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={filas} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke={C.grilla} />
          <XAxis dataKey="etiqueta" {...ejes} />
          <YAxis yAxisId="kg" {...ejes} width={56} tickFormatter={(v: number) => `${compacto.format(v)} kg`} />
          <YAxis yAxisId="precio" orientation="right" {...ejes} width={52} tickFormatter={(v: number) => `S/ ${v}`} />
          <Tooltip {...estiloTooltip}
            labelFormatter={(_, p) => (p?.[0]?.payload ? nombrePeriodo(p[0].payload.periodo) : "")}
            formatter={(v: number, n: string) => [n.startsWith("Precio") ? `${soles(v)}/kg` : kg(v), n]} />
          <Legend wrapperStyle={{ fontSize: 12, color: C.texto }} iconType="circle" iconSize={8} />
          <Bar yAxisId="kg" dataKey="kg_comprado" name="Kg comprados" fill={C.compras} radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Bar yAxisId="kg" dataKey="kg_vendido" name="Kg vendidos" fill={C.ventas} radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Line yAxisId="precio" type="monotone" dataKey="precio_compra" name="Precio compra" stroke="var(--color-sky-700)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line yAxisId="precio" type="monotone" dataKey="precio_venta" name="Precio venta" stroke="var(--color-anil-700)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
