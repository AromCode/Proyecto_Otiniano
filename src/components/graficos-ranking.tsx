"use client";

import { useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Medal } from "lucide-react";
import { cx } from "@/components/ui/clases";
import { fecha, kg, numero, soles } from "@/lib/formato";

export interface FilaRanking {
  id: string;
  nombre: string;
  documento: string;
  operaciones: number;
  kg: number;
  importe: number;
  ultima: string | null;
}

type Medida = "kg" | "importe";

// Colores de módulo: proveedores = Compras (celeste), clientes = Ventas (añil).
// Tonos medios (600) que se leen bien en claro y oscuro.
const COLOR = { compras: "var(--color-sky-600)", ventas: "var(--color-anil-600)" } as const;

const compacto = new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 });
const corto = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** Ranking horizontal (top 10) con cambio Kilos / Soles y podio de los 3 primeros */
export function GraficoRanking({
  filas, tono, operacion, base,
}: {
  filas: FilaRanking[];
  tono: keyof typeof COLOR;
  /** «compras» o «ventas», para el texto del detalle */
  operacion: string;
  /** Ruta de la ficha de cada tercero, p. ej. /proveedores */
  base: string;
}) {
  const [medida, setMedida] = useState<Medida>("kg");
  if (!filas.length) {
    return <p className="px-4 py-10 text-center text-sm text-stone-500">Sin {operacion} en este periodo.</p>;
  }

  const datos = [...filas].sort((a, b) => b[medida] - a[medida]).slice(0, 10)
    .map((f, i) => ({ ...f, puesto: i + 1, etiqueta: `${i + 1}. ${corto(f.nombre, 22)}` }));
  const total = filas.reduce((s, f) => s + f[medida], 0);
  const fmt = (v: number) => (medida === "kg" ? kg(v) : soles(v));
  const alto = datos.length * 38 + 30;

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs text-stone-500">Top {datos.length} por {medida === "kg" ? "kilos" : "soles"}</p>
          <div className="flex rounded-lg border border-stone-200 p-0.5" role="group" aria-label="Medida">
            {(["kg", "importe"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMedida(m)}
                aria-pressed={medida === m}
                className={cx("rounded-md px-2.5 py-1 text-xs font-medium",
                  medida === m ? "bg-stone-800 text-stone-50" : "text-stone-600 hover:bg-stone-100")}
              >
                {m === "kg" ? "Kilos" : "Soles"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: alto }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} stroke="var(--color-stone-200)" />
              <XAxis
                type="number"
                tickFormatter={(v: number) => compacto.format(v)}
                tick={{ fill: "var(--color-stone-500)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="etiqueta"
                width={150}
                tick={{ fill: "var(--color-stone-700)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--color-stone-100)" }}
                content={({ active, payload }) => {
                  const f = active && payload?.[0]?.payload as (typeof datos)[number] | undefined;
                  if (!f) return null;
                  return (
                    <div className="rounded-lg border border-stone-200 bg-superficie px-3 py-2 text-xs shadow-lg">
                      <p className="mb-1 font-semibold text-stone-900">{f.puesto}. {f.nombre}</p>
                      <p className="text-stone-500">{f.documento}</p>
                      <p className="cifra mt-1 text-stone-700">{kg(f.kg)} · {soles(f.importe)}</p>
                      <p className="text-stone-500">{numero(f.operaciones)} {operacion} · última {fecha(f.ultima)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey={medida} radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false}>
                {datos.map((d) => (
                  <Cell key={d.id} fill={COLOR[tono]} fillOpacity={d.puesto <= 3 ? 1 : 0.55} />
                ))}
                <LabelList
                  dataKey={medida}
                  position="right"
                  formatter={(v) => compacto.format(Number(v))}
                  style={{ fill: "var(--color-stone-600)", fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ol className="space-y-2 self-start">
        {datos.slice(0, 3).map((f) => (
          <li key={f.id}>
            <Link href={`${base}/${f.id}`} className="flex items-start gap-3 rounded-lg border border-stone-200 p-3 hover:bg-stone-50">
              <Medal className={cx("mt-0.5 size-5 shrink-0",
                f.puesto === 1 ? "text-amber-500" : f.puesto === 2 ? "text-stone-400" : "text-marca-500")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-stone-900">{f.nombre}</span>
                <span className="cifra block text-xs text-stone-600">{fmt(f[medida])}</span>
                <span className="block text-xs text-stone-500">
                  {total > 0 ? `${numero((f[medida] / total) * 100)} % del total` : ""} · {numero(f.operaciones)} {operacion}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
