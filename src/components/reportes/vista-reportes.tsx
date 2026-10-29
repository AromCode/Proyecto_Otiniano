import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { REPORTES, filtrosDesde, totales, type Col } from "@/lib/reportes";
import { fechaHora, hoyLima, kg, numero, porcentaje, soles } from "@/lib/formato";
import { Aviso, Encabezado, Tarjeta } from "@/components/ui/basicos";
import { claseBoton, claseInput, cx } from "@/components/ui/clases";
import { cabeTabla } from "@/components/ui/tabla";
import { EnlaceDescarga } from "@/components/ui/enlace-descarga";

function celda(c: Col, v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  switch (c.tipo) {
    case "soles": return soles(v as string);
    case "precio": return `S/ ${Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    case "kg": return kg(v as string);
    case "num": return numero(v as string);
    case "pct": return porcentaje(v as string);
    case "fecha": return fechaHora(v as string);
    default: return String(v);
  }
}

/** Hoy, este mes, el mes pasado, este año y los últimos 12 meses (fechas de Lima) */
function rangosRapidos() {
  const hoy = hoyLima();
  const [a, m] = hoy.split("-").map(Number);
  const iso = (y: number, mes: number, d: number) => new Date(Date.UTC(y, mes - 1, d)).toISOString().slice(0, 10);
  return [
    { texto: "Hoy", desde: hoy, hasta: hoy },
    { texto: "Este mes", desde: iso(a, m, 1), hasta: hoy },
    { texto: "Mes pasado", desde: iso(a, m - 1, 1), hasta: iso(a, m, 0) },
    { texto: "Este año", desde: iso(a, 1, 1), hasta: hoy },
    { texto: "Últimos 12 meses", desde: iso(a, m - 11, 1), hasta: hoy },
  ];
}

const esNumero = (c: Col) => c.tipo !== "texto" && c.tipo !== "fecha";
const alinear = (c: Col) => (esNumero(c) ? "text-right" : "text-left");

/** Una fila del reporte como tarjeta: la primera columna de título, el resto en rejilla */
function FilaTarjeta({ columnas, fila, fuerte, titulo }: { columnas: Col[]; fila: Record<string, unknown>; fuerte?: boolean; titulo?: string }) {
  const [primera, ...resto] = columnas;
  return (
    <>
      <p className={cx("text-sm", fuerte ? "font-semibold" : "font-medium")}>{titulo ?? celda(primera, fila[primera.clave])}</p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm @md:grid-cols-3 @2xl:grid-cols-4">
        {resto.filter((c) => c.clave in fila).map((c) => (
          <div key={c.clave} className="min-w-0">
            <dt className="truncate text-xs text-stone-500">{c.titulo}</dt>
            <dd className={cx("cifra truncate", fuerte && "font-semibold")}>{celda(c, fila[c.clave])}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export type ParamsReporte = { r?: string; desde?: string; hasta?: string; agrupar?: string; metal?: string; caja?: string };

/** Vista de reportes reutilizable: cada módulo muestra solo los suyos (ids) en su propia ruta (base). */
export async function VistaReportes({
  sp, base, ids, titulo = "Reportes", descripcion = "Todos los montos salen de la base de datos; Excel y PDF muestran lo mismo que la pantalla.",
}: { sp: ParamsReporte; base: string; ids?: string[]; titulo?: string; descripcion?: string }) {
  const ctx = await exigir("verReportes");
  const lista = ids ? ids.map((id) => REPORTES.find((r) => r.id === id)!).filter(Boolean) : REPORTES;
  const def = lista.find((r) => r.id === sp.r) ?? lista[0];
  const f = filtrosDesde(sp);

  const [datos, metales, cajas] = await Promise.all([
    def.obtener(ctx, f).catch((e: Error) => ({ columnas: [], filas: [], nota: undefined, error: e.message })),
    def.usaMetal ? ctx.supabase.from("v_productos").select("id, nombre:ruta").eq("empresa_id", ctx.empresa.id).order("clave_orden") : null,
    def.usaCaja ? ctx.supabase.from("cajas").select("id, nombre").eq("empresa_id", ctx.empresa.id).order("orden") : null,
  ]);
  const t = totales(datos);
  // Letra compacta: entra un par de columnas más que en una tabla normal del mismo ancho
  const cabe = cabeTabla(datos.columnas.length - 2);
  const qs = new URLSearchParams(Object.entries({ ...f, r: def.id }).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <Encabezado titulo={titulo} descripcion={descripcion} />

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {lista.length > 1 && lista.map((r) => (
          <Link
            key={r.id}
            href={`${base}?r=${r.id}&desde=${f.desde}&hasta=${f.hasta}`}
            className={cx(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium",
              r.id === def.id ? "border-marca-600 bg-marca-50 text-marca-700" : "border-stone-200 bg-superficie text-stone-700 hover:bg-stone-50",
            )}
          >
            {r.titulo}
          </Link>
        ))}
      </div>

      <Tarjeta>
        <div className="border-b border-stone-100 p-4">
          <h2 className="font-semibold">{def.titulo}</h2>
          <p className="text-sm text-stone-500">{def.descripcion}</p>
          {def.id !== "patrimonio" && (
            // Temporadas rápidas: el rango queda en la URL y se puede ajustar con Desde/Hasta
            <div className="mt-3 flex flex-wrap gap-1.5">
              {rangosRapidos().map((p) => (
                <Link key={p.texto} href={`${base}?${new URLSearchParams(Object.entries({ ...f, r: def.id, desde: p.desde, hasta: p.hasta }).filter(([, v]) => v) as [string, string][])}`}
                  className={cx("rounded-md border px-2 py-1 text-xs font-medium",
                    f.desde === p.desde && f.hasta === p.hasta ? "border-marca-600 bg-marca-50 text-marca-700" : "border-stone-200 text-stone-600 hover:bg-stone-50")}>
                  {p.texto}
                </Link>
              ))}
            </div>
          )}
          <form method="get" className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
            <input type="hidden" name="r" value={def.id} />
            {def.id !== "patrimonio" && (
              <>
                <label className="block sm:w-40">
                  <span className="mb-1 block text-xs font-medium text-stone-600">Desde</span>
                  <input type="date" name="desde" defaultValue={f.desde} className={claseInput} />
                </label>
                <label className="block sm:w-40">
                  <span className="mb-1 block text-xs font-medium text-stone-600">Hasta</span>
                  <input type="date" name="hasta" defaultValue={f.hasta} className={claseInput} />
                </label>
              </>
            )}
            {def.agrupaciones && (
              <label className="block sm:w-44">
                <span className="mb-1 block text-xs font-medium text-stone-600">Agrupar</span>
                <select name="agrupar" defaultValue={f.agrupar ?? def.agrupaciones[0].valor} className={claseInput}>
                  {def.agrupaciones.map((a) => <option key={a.valor} value={a.valor}>{a.texto}</option>)}
                </select>
              </label>
            )}
            {metales && (
              <label className="block sm:w-44">
                <span className="mb-1 block text-xs font-medium text-stone-600">Producto</span>
                <select name="metal" defaultValue={f.metal ?? ""} className={claseInput} required>
                  <option value="">Elija…</option>
                  {(metales.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </label>
            )}
            {cajas && (
              <label className="block sm:w-44">
                <span className="mb-1 block text-xs font-medium text-stone-600">Caja</span>
                <select name="caja" defaultValue={f.caja ?? ""} className={claseInput}>
                  <option value="">Todas</option>
                  {(cajas.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
            )}
            <button className={cx(claseBoton("secundario"), "h-[42px]")}>Ver</button>
            <div className="col-span-2 flex gap-2 sm:ml-auto">
              <EnlaceDescarga href={`/reportes/exportar/${def.id}?${qs}&formato=xlsx`} className={cx(claseBoton("secundario"), "h-[42px] flex-1 sm:flex-none")}>
                <Download className="size-4" /> Excel
              </EnlaceDescarga>
              <a href={`/reportes/exportar/${def.id}?${qs}&formato=pdf`} target="_blank" className={cx(claseBoton("secundario"), "h-[42px] flex-1 sm:flex-none")}>
                <FileText className="size-4" /> PDF
              </a>
            </div>
          </form>
        </div>

        {"error" in datos && datos.error && <div className="p-4"><Aviso tono="rojo">{datos.error}</Aviso></div>}
        {datos.nota && <p className="border-b border-stone-100 px-4 py-2 text-xs text-stone-500">{datos.nota}</p>}

        {datos.filas.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-stone-500">Sin datos para el periodo elegido.</p>
        ) : (
          // Tarjeta ancha: tabla (letra compacta hasta que sobra espacio). Angosta (celular, laptop con el menú
          // abierto): cada fila como tarjeta, así nunca hay que desplazar de costado. Clases completas para Tailwind.
          <div className="@container overflow-hidden rounded-b-xl">
            <div className={cx("overflow-x-auto", cabe.tabla)}>
              <table className="w-full text-xs @5xl:text-sm">
                <thead>
                  <tr className="border-b border-marca-100 bg-marca-50 text-[11px] uppercase tracking-wider text-marca-800">
                    {datos.columnas.map((c) => (
                      <th key={c.clave} className={cx("px-2 py-2.5 font-semibold first:pl-4 last:pr-4 @5xl:px-3", alinear(c))}>{c.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {datos.filas.map((r, i) => (
                    <tr key={i} className={cx("transition-colors even:bg-stone-50/70 hover:bg-marca-50", Boolean(r._fuerte) && "bg-marca-50/60 font-semibold")}>
                      {datos.columnas.map((c) => (
                        <td key={c.clave} className={cx("px-2 py-2 first:pl-4 last:pr-4 @5xl:px-3", alinear(c), esNumero(c) && "cifra")}>
                          {celda(c, r[c.clave])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {t && (
                  <tfoot className="border-t-2 border-marca-200 bg-marca-50 font-semibold text-marca-800">
                    <tr>
                      {datos.columnas.map((c, i) => (
                        <td key={c.clave} className={cx("px-2 py-2.5 first:pl-4 last:pr-4 @5xl:px-3", alinear(c), esNumero(c) && "cifra")}>
                          {i === 0 ? "Total" : c.clave in t ? celda(c, t[c.clave]) : ""}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <ul className={cx("divide-y divide-stone-100", cabe.tarjetas)}>
              {datos.filas.map((r, i) => (
                <li key={i} className={cx("px-4 py-3 even:bg-stone-50/70", Boolean(r._fuerte) && "bg-marca-50/60")}>
                  <FilaTarjeta columnas={datos.columnas} fila={r} fuerte={Boolean(r._fuerte)} />
                </li>
              ))}
              {t && (
                <li className="border-t-2 border-marca-200 bg-marca-50 px-4 py-3 text-marca-800">
                  <FilaTarjeta columnas={datos.columnas} fila={t} titulo="Total" fuerte />
                </li>
              )}
            </ul>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
