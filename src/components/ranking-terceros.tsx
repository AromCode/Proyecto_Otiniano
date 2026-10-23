import Link from "next/link";
import type { Contexto } from "@/lib/contexto";
import type { Database } from "@/lib/supabase/database.types";
import { hoyLima } from "@/lib/formato";
import { Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { claseBoton, claseInput, cx } from "@/components/ui/clases";
import { GraficoRanking, type FilaRanking } from "./graficos-ranking";

// Ranking de proveedores (quién nos vende más) o de clientes (quién nos compra más), por fechas y metal.
// Filtros por GET con prefijo «r» para no chocar con la búsqueda de la lista (q, estado).

const PRESETS = [
  { id: "mes", texto: "Este mes" },
  { id: "3m", texto: "Últimos 3 meses" },
  { id: "anio", texto: "Este año" },
  { id: "todo", texto: "Todo" },
  { id: "rango", texto: "Personalizado" },
] as const;
type Preset = (typeof PRESETS)[number]["id"];

const esFecha = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

function rango(sp: Record<string, string | undefined>) {
  const hoy = hoyLima();
  const p = (PRESETS.some((x) => x.id === sp.rp) ? sp.rp : "3m") as Preset;
  const [a, m] = hoy.split("-").map(Number);
  let desde: string;
  let hasta = hoy;
  if (p === "mes") desde = `${hoy.slice(0, 8)}01`;
  else if (p === "anio") desde = `${a}-01-01`;
  else if (p === "todo") desde = "2000-01-01";
  else if (p === "rango") {
    desde = esFecha(sp.rdesde) ? sp.rdesde! : `${hoy.slice(0, 8)}01`;
    hasta = esFecha(sp.rhasta) ? sp.rhasta! : hoy;
    if (desde > hasta) [desde, hasta] = [hasta, desde];
  } else desde = new Date(Date.UTC(a, m - 3, 1)).toISOString().slice(0, 10);
  return { p, desde, hasta };
}

const fechaCorta = (d: string) => d.split("-").reverse().join("/");

export async function RankingTerceros({
  ctx, tipo, sp, ruta,
}: {
  ctx: Pick<Contexto, "supabase" | "empresa">;
  tipo: "proveedores" | "clientes";
  sp: Record<string, string | undefined>;
  /** Ruta de la página (para armar los enlaces de filtro) */
  ruta: string;
}) {
  const { p, desde, hasta } = rango(sp);
  const metal = sp.rmetal || undefined;
  const args = { p_empresa: ctx.empresa.id, p_desde: desde, p_hasta: hasta, p_metal: metal };

  const leerFilas = async (): Promise<FilaRanking[]> => {
    if (tipo === "proveedores") {
      const { data } = await ctx.supabase.rpc("ranking_proveedores", args);
      const filas = (data ?? []) as Database["public"]["Functions"]["ranking_proveedores"]["Returns"];
      return filas.map((r) => ({
        id: r.proveedor_id, nombre: r.nombre, documento: r.documento, operaciones: Number(r.n_compras),
        kg: Number(r.kg), importe: Number(r.importe), ultima: r.ultima,
      }));
    }
    const { data } = await ctx.supabase.rpc("ranking_clientes", args);
    const filas = (data ?? []) as Database["public"]["Functions"]["ranking_clientes"]["Returns"];
    return filas.map((r) => ({
      id: r.comprador_id, nombre: r.nombre, documento: r.documento, operaciones: Number(r.n_ventas),
      kg: Number(r.kg), importe: Number(r.importe), ultima: r.ultima,
    }));
  };
  const [{ data: metales }, filas] = await Promise.all([
    ctx.supabase.from("v_productos").select("id, nombre:ruta").eq("empresa_id", ctx.empresa.id).order("clave_orden"),
    leerFilas(),
  ]);

  // Enlaces que conservan los demás parámetros de la página
  const href = (cambios: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...cambios })) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `${ruta}?${s}` : ruta;
  };
  const conservar = Object.entries(sp).filter(([k, v]) => v && !["rp", "rdesde", "rhasta", "rmetal"].includes(k));
  const esProv = tipo === "proveedores";

  return (
    <Tarjeta className="mb-4">
      <TituloTarjeta
        accion={esProv && (
          <Link href={`/reportes?r=ranking&desde=${desde}&hasta=${hasta}`} className="text-xs font-medium text-marca-700 hover:underline">
            Ver ranking completo
          </Link>
        )}
      >
        {esProv ? "Proveedores que más nos venden" : "Clientes que más nos compran"}
        <span className="ml-1 font-normal text-stone-500">· {p === "todo" ? "todo el historial" : `${fechaCorta(desde)} al ${fechaCorta(hasta)}`}</span>
      </TituloTarjeta>

      <div className="space-y-2 border-b border-stone-100 px-4 py-3">
        <nav aria-label="Periodo del ranking" className="flex flex-wrap gap-1.5">
          {PRESETS.map((x) => (
            <Link
              key={x.id}
              href={href({ rp: x.id, ...(x.id === "rango" ? { rdesde: desde, rhasta: hasta } : { rdesde: undefined, rhasta: undefined }) })}
              scroll={false}
              aria-current={p === x.id ? "true" : undefined}
              className={cx(
                "inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors",
                p === x.id ? "border-marca-600 bg-marca-600 text-white" : "border-stone-300 bg-superficie text-stone-700 hover:bg-stone-50",
              )}
            >
              {x.texto}
            </Link>
          ))}
        </nav>
        <form method="get" action={ruta} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
          {conservar.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input type="hidden" name="rp" value={p === "rango" ? "rango" : p} />
          {p === "rango" && (
            <>
              <label className="block sm:w-40">
                <span className="mb-1 block text-xs font-medium text-stone-600">Desde</span>
                <input type="date" name="rdesde" defaultValue={desde} max={hoyLima()} className={claseInput} />
              </label>
              <label className="block sm:w-40">
                <span className="mb-1 block text-xs font-medium text-stone-600">Hasta</span>
                <input type="date" name="rhasta" defaultValue={hasta} max={hoyLima()} className={claseInput} />
              </label>
            </>
          )}
          <label className={cx("block sm:w-44", p !== "rango" && "col-span-1")}>
            <span className="mb-1 block text-xs font-medium text-stone-600">Producto</span>
            <select name="rmetal" defaultValue={metal ?? ""} className={claseInput}>
              <option value="">Todos los productos</option>
              {(metales ?? []).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </label>
          <button className={cx(claseBoton("secundario", "md"), "h-[42px] self-end", p === "rango" && "col-span-2 sm:col-span-1")}>
            Aplicar
          </button>
        </form>
      </div>

      <GraficoRanking
        filas={filas}
        tono={esProv ? "teal" : "indigo"}
        operacion={esProv ? "compras" : "ventas"}
        base={esProv ? "/proveedores" : "/compradores"}
      />
    </Tarjeta>
  );
}
