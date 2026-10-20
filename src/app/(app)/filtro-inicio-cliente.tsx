"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { claseBoton, claseInput, cx } from "@/components/ui/clases";
import { Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { CurvaS, GraficoMensual, type FilaDia, type FilaMes } from "@/components/graficos-dashboard";
import { fecha, hoyLima, nombrePeriodo } from "@/lib/formato";
import {
  PERIODOS, RANGOS_CURVA, RANGOS_MESES, rangoCurva, rangoMeses, sumarDias, sumarMeses, url, type FiltroInicio,
} from "./filtro-inicio";

/**
 * Filtro de periodo (resultado): navega al servidor; se queda la información actual (atenuada) hasta
 * que llegan los datos nuevos completos. Los atajos de periodo se precargan, así el cambio es inmediato.
 *
 * Rangos de los gráficos (evolución y curva S): el servidor manda de una vez la serie de una ventana
 * amplia (desde enero del año anterior) y aquí solo se filtra: el cambio es instantáneo y la URL se
 * actualiza sin recargar. Solo un rango fuera de esa ventana vuelve a pedir datos al servidor.
 */
type Rangos = Pick<FiltroInicio, "mdesde" | "mhasta" | "sdesde" | "shasta">;
const rangosDe = (f: FiltroInicio): Rangos => ({ mdesde: f.mdesde, mhasta: f.mhasta, sdesde: f.sdesde, shasta: f.shasta });

const Ctx = createContext<{
  f: FiltroInicio; rangos: Rangos; pendiente: boolean;
  ir: (href: string) => void; cambiarRangos: (r: Partial<Rangos>) => void;
} | null>(null);

function useFiltro() {
  const c = useContext(Ctx);
  if (!c) throw new Error("Filtro del inicio fuera de <ZonaFiltrada>");
  return c;
}

export function ZonaFiltrada({ f, children }: { f: FiltroInicio; children: React.ReactNode }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [rangos, setRangos] = useState(() => rangosDe(f));
  // Si el servidor manda otro filtro (navegación), manda ese
  const clave = `${f.mdesde}|${f.mhasta}|${f.sdesde}|${f.shasta}`;
  const [claveVista, setClaveVista] = useState(clave);
  if (clave !== claveVista) {
    setClaveVista(clave);
    setRangos(rangosDe(f));
  }
  const ir = (href: string) => iniciar(() => router.push(href, { scroll: false }));
  const cambiarRangos = (r: Partial<Rangos>) => {
    const nuevos = { ...rangos, ...r };
    setRangos(nuevos);
    // Next sincroniza replaceState con su router: la URL queda compartible, sin pedir nada al servidor
    window.history.replaceState(null, "", url({ ...f, ...nuevos }, {}));
  };
  return (
    <Ctx.Provider value={{ f, rangos, pendiente, ir, cambiarRangos }}>
      <div aria-busy={pendiente}>{children}</div>
    </Ctx.Provider>
  );
}

/** Contenido que depende del filtro: se atenúa mientras se actualiza */
export function Actualizable({ children }: { children: React.ReactNode }) {
  const { pendiente } = useFiltro();
  return <div className={cx("transition-opacity duration-150", pendiente && "pointer-events-none opacity-50")}>{children}</div>;
}

/** Enlace de filtro: sin JavaScript navega; con JavaScript usa `alElegir` o la navegación atenuada */
function EnlaceFiltro({ href, className, activo, precargar, alElegir, children }: {
  href: string; className: string; activo: boolean; precargar?: boolean; alElegir?: () => void; children: React.ReactNode;
}) {
  const { ir } = useFiltro();
  return (
    <Link
      href={href}
      prefetch={precargar ? true : false}
      scroll={false}
      className={className}
      aria-current={activo ? "true" : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        if (alElegir) alElegir();
        else ir(href);
      }}
    >
      {children}
    </Link>
  );
}

const chip = (activo: boolean) => cx(
  "inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors",
  activo ? "border-marca-600 bg-marca-600 text-white" : "border-stone-300 bg-superficie text-stone-700 hover:bg-stone-50",
);

/** Periodo rápido o rango propio (también funciona sin JavaScript: son enlaces y un form GET) */
export function BarraFiltroInicio() {
  const { f, rangos, pendiente, ir } = useFiltro();
  const actual = { ...f, ...rangos };
  return (
    <div className="mb-3 space-y-2">
      <nav aria-label="Periodo" className="flex flex-wrap items-center gap-1.5">
        {PERIODOS.map((x) => (
          // Atajos fijos precargados (en producción): al tocarlos la página ya está lista
          <EnlaceFiltro key={x.id} href={url(actual, { p: x.id })} className={chip(f.p === x.id)} activo={f.p === x.id} precargar={x.id !== "rango"}>
            {x.texto}
          </EnlaceFiltro>
        ))}
        {pendiente && <Loader2 className="size-4 animate-spin text-stone-500" aria-label="Actualizando" />}
      </nav>
      {f.p === "rango" && (
        <form
          method="get"
          action="/"
          className="grid grid-cols-2 gap-2 sm:flex sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            ir(url(actual, { p: "rango", desde: String(fd.get("desde") || f.desde), hasta: String(fd.get("hasta") || f.hasta) }));
          }}
        >
          <input type="hidden" name="p" value="rango" />
          <input type="hidden" name="mdesde" value={rangos.mdesde} />
          <input type="hidden" name="mhasta" value={rangos.mhasta} />
          <label className="block sm:w-40">
            <span className="mb-1 block text-xs font-medium text-stone-600">Desde</span>
            <input type="date" name="desde" defaultValue={f.desde} max={hoyLima()} className={claseInput} />
          </label>
          <label className="block sm:w-40">
            <span className="mb-1 block text-xs font-medium text-stone-600">Hasta</span>
            <input type="date" name="hasta" defaultValue={f.hasta} max={hoyLima()} className={claseInput} />
          </label>
          <button disabled={pendiente} className={cx(claseBoton("secundario", "md"), "col-span-2 h-[42px] sm:col-span-1")}>Aplicar</button>
        </form>
      )}
    </div>
  );
}

/** Últimos 4 años de meses, del más reciente al más antiguo, con su nombre completo */
function opcionesMes() {
  const actual = hoyLima().slice(0, 7);
  return Array.from({ length: 48 }, (_, i) => sumarMeses(actual, -i));
}

// Controles compactos de las barras de filtro (claseInput fuerza ancho completo y altura de formulario)
const claseCompacto = "h-9 min-w-0 rounded-lg border border-stone-300 bg-superficie px-2 text-xs leading-none text-stone-900 " +
  "focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-200 disabled:opacity-60";
const claseSelect = cx(claseCompacto, "pr-1");

/** Chip de atajo dentro de las barras de filtro */
const atajo = (activo: boolean) => cx("rounded-md px-2 py-1 text-xs font-medium",
  activo ? "bg-marca-50 text-marca-700" : "text-stone-500 hover:bg-stone-100");

/** Fila diaria que manda el servidor (dashboard_serie.dias) */
export interface DiaSerie { dia: string; compras: number; ventas: number; utilidad: number }

/** Evolución mensual: filtra en el navegador la serie de la ventana (`ventanaDesde` = YYYY-MM-DD) */
export function SeccionEvolucion({ meses, ventanaDesde, stock }: { meses: FilaMes[]; ventanaDesde: string; stock: React.ReactNode }) {
  const { f, rangos, pendiente, ir, cambiarRangos } = useFiltro();
  const { mdesde, mhasta } = rangos;
  const mesVentana = ventanaDesde.slice(0, 7);

  const elegir = (cambio: { mdesde?: string; mhasta?: string }) => {
    let d = cambio.mdesde ?? mdesde;
    let h = cambio.mhasta ?? mhasta;
    if (d > h) [d, h] = [h, d];
    if (d >= mesVentana) cambiarRangos({ mdesde: d, mhasta: h });
    else ir(url({ ...f, ...rangos }, { mdesde: d, mhasta: h }));
  };

  // Todos los meses del rango (con ceros donde no hubo movimiento) para que las barras no se estiren
  const datos = useMemo(() => {
    const porPeriodo = new Map(meses.map((m) => [m.periodo, m]));
    const filas: FilaMes[] = [];
    for (let m = mdesde; m <= mhasta; m = sumarMeses(m, 1)) {
      const x = porPeriodo.get(m);
      filas.push({ periodo: m, compras: Number(x?.compras ?? 0), ventas: Number(x?.ventas ?? 0), utilidad: Number(x?.utilidad ?? 0) });
    }
    return filas;
  }, [meses, mdesde, mhasta]);

  const hoy = hoyLima();
  const finMes = sumarDias(`${sumarMeses(mhasta, 1)}-01`, -1);
  const resultados = `/reportes?r=resultados&desde=${mdesde}-01&hasta=${finMes > hoy ? hoy : finMes}`;

  return (
    <section aria-labelledby="titulo-evolucion">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-evolucion" className="text-base font-semibold text-stone-800">Evolución</h2>
          <p className="text-xs text-stone-500">De {nombrePeriodo(mdesde)} a {nombrePeriodo(mhasta)}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Rango de meses">
            {RANGOS_MESES.map((r) => {
              const rg = rangoMeses(r.id);
              const activo = rg.mdesde === mdesde && rg.mhasta === mhasta;
              return (
                <EnlaceFiltro key={r.id} href={url({ ...f, ...rangos }, rg)} activo={activo} className={atajo(activo)} alElegir={() => elegir(rg)}>
                  {r.texto}
                </EnlaceFiltro>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="sr-only" htmlFor="mdesde">Desde el mes</label>
            <select id="mdesde" value={mdesde} disabled={pendiente} onChange={(e) => elegir({ mdesde: e.target.value })} className={claseSelect}>
              {opcionesMes().map((m) => <option key={m} value={m}>{nombrePeriodo(m)}</option>)}
            </select>
            <span className="text-xs text-stone-500">a</span>
            <label className="sr-only" htmlFor="mhasta">Hasta el mes</label>
            <select id="mhasta" value={mhasta} disabled={pendiente} onChange={(e) => elegir({ mhasta: e.target.value })} className={claseSelect}>
              {opcionesMes().map((m) => <option key={m} value={m}>{nombrePeriodo(m)}</option>)}
            </select>
          </div>
        </div>
      </div>
      <Actualizable>
        <div className="grid gap-4 lg:grid-cols-5">
          <Tarjeta className="lg:col-span-3">
            <TituloTarjeta accion={<Link href={resultados} className="text-xs font-medium text-marca-700">Estado de resultados</Link>}>
              Compras, ventas y utilidad por mes
            </TituloTarjeta>
            <div className="p-4"><GraficoMensual datos={datos} /></div>
          </Tarjeta>
          {stock}
        </div>
      </Actualizable>
    </section>
  );
}

/** Curva S: acumula en el navegador los montos diarios de la BD (en céntimos, exacto) desde el inicio del intervalo */
export function SeccionCurva({ dias, ventanaDesde }: { dias: DiaSerie[]; ventanaDesde: string }) {
  const { f, rangos, pendiente, ir, cambiarRangos } = useFiltro();
  const { sdesde, shasta } = rangos;
  const hoy = hoyLima();

  const elegir = (d: string, h: string) => {
    if (d > h) [d, h] = [h, d];
    if (h > hoy) h = hoy;
    if (d >= ventanaDesde) cambiarRangos({ sdesde: d, shasta: h });
    else ir(url({ ...f, ...rangos }, { sdesde: d, shasta: h }));
  };

  const datos = useMemo(() => {
    let c = 0, v = 0, u = 0;
    const filas: FilaDia[] = [];
    for (const x of dias) {
      if (x.dia < sdesde || x.dia > shasta) continue;
      c += Math.round(Number(x.compras) * 100);
      v += Math.round(Number(x.ventas) * 100);
      u += Math.round(Number(x.utilidad) * 100);
      filas.push({ dia: x.dia, compras_acum: c / 100, ventas_acum: v / 100, utilidad_acum: u / 100 });
    }
    return filas;
  }, [dias, sdesde, shasta]);

  return (
    <section aria-labelledby="titulo-curva" className="mt-6">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-curva" className="text-base font-semibold text-stone-800">Curva S · acumulado</h2>
          <p className="text-xs text-stone-500">Del {fecha(`${sdesde}T12:00:00-05:00`)} al {fecha(`${shasta}T12:00:00-05:00`)} · cómo van creciendo ventas, compras y utilidad día a día</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Intervalo de la curva S">
            {RANGOS_CURVA.map((r) => {
              const rg = rangoCurva(r.id);
              const activo = rg.sdesde === sdesde && rg.shasta === shasta;
              return (
                <EnlaceFiltro key={r.id} href={url({ ...f, ...rangos }, rg)} activo={activo} className={atajo(activo)} alElegir={() => elegir(rg.sdesde, rg.shasta)}>
                  {r.texto}
                </EnlaceFiltro>
              );
            })}
          </div>
          <form
            method="get"
            action="/"
            className="flex flex-wrap items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              elegir(String(fd.get("sdesde") || sdesde), String(fd.get("shasta") || shasta));
            }}
          >
            <label className="sr-only" htmlFor="sdesde">Desde</label>
            <input id="sdesde" type="date" name="sdesde" defaultValue={sdesde} max={hoy} key={`d${sdesde}`}
              className={cx(claseCompacto, "w-[8.75rem]")} />
            <span className="text-xs text-stone-500">a</span>
            <label className="sr-only" htmlFor="shasta">Hasta</label>
            <input id="shasta" type="date" name="shasta" defaultValue={shasta} max={hoy} key={`h${shasta}`}
              className={cx(claseCompacto, "w-[8.75rem]")} />
            <button disabled={pendiente} className={cx(claseBoton("secundario", "sm"), "h-9 px-3 text-xs")}>Ver</button>
          </form>
        </div>
      </div>
      <Actualizable>
        <Tarjeta>
          <div className="p-4"><CurvaS datos={datos} /></div>
        </Tarjeta>
      </Actualizable>
    </section>
  );
}
