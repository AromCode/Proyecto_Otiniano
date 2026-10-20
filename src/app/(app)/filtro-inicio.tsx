import { fecha, hoyLima } from "@/lib/formato";

// Filtros del Inicio: lectura de la URL (servidor). La barra está en filtro-inicio-cliente.tsx
export const PERIODOS = [
  { id: "hoy", texto: "Hoy" },
  { id: "7d", texto: "Últimos 7 días" },
  { id: "mes", texto: "Este mes" },
  { id: "mes_ant", texto: "Mes anterior" },
  { id: "anio", texto: "Este año" },
  { id: "rango", texto: "Personalizado" },
] as const;
export type Periodo = (typeof PERIODOS)[number]["id"];

/** Atajos del rango de meses de los gráficos (barras y curva S) */
export const RANGOS_MESES = [
  { id: "6", texto: "6 meses" },
  { id: "12", texto: "12 meses" },
  { id: "anio", texto: "Este año" },
  { id: "anio_ant", texto: "Año anterior" },
] as const;

/** Atajos del intervalo de la curva S (acumulado día a día) */
export const RANGOS_CURVA = [
  { id: "mes", texto: "Este mes" },
  { id: "3m", texto: "Últimos 3 meses" },
  { id: "anio", texto: "Este año" },
  { id: "12m", texto: "12 meses" },
] as const;

export function rangoCurva(id: string, hoy = hoyLima()): { sdesde: string; shasta: string } {
  if (id === "3m") return { sdesde: sumarDias(hoy, -89), shasta: hoy };
  if (id === "anio") return { sdesde: `${hoy.slice(0, 4)}-01-01`, shasta: hoy };
  if (id === "12m") return { sdesde: sumarDias(hoy, -364), shasta: hoy };
  return { sdesde: `${hoy.slice(0, 7)}-01`, shasta: hoy };
}

export interface FiltroInicio {
  p: Periodo;
  desde: string;
  hasta: string;
  etiqueta: string;
  /** Rango de meses de los gráficos: YYYY-MM a YYYY-MM */
  mdesde: string;
  mhasta: string;
  /** Días que cubre la serie (primer día de mdesde → fin de mhasta, sin pasar de hoy) */
  serieDesde: string;
  serieHasta: string;
  /** Intervalo propio de la curva S (YYYY-MM-DD) */
  sdesde: string;
  shasta: string;
}

const esMes = (m?: string) => !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
/** Suma meses a un YYYY-MM */
export function sumarMeses(m: string, n: number) {
  const [a, mm] = m.split("-").map(Number);
  return new Date(Date.UTC(a, mm - 1 + n, 1)).toISOString().slice(0, 7);
}
/** Rango de meses de un atajo */
export function rangoMeses(id: string, hoy = hoyLima()): { mdesde: string; mhasta: string } {
  const actual = hoy.slice(0, 7);
  const anio = hoy.slice(0, 4);
  if (id === "6") return { mdesde: sumarMeses(actual, -5), mhasta: actual };
  if (id === "anio") return { mdesde: `${anio}-01`, mhasta: actual };
  if (id === "anio_ant") return { mdesde: `${Number(anio) - 1}-01`, mhasta: `${Number(anio) - 1}-12` };
  return { mdesde: sumarMeses(actual, -11), mhasta: actual };
}

const esFecha = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
/** Suma días a un YYYY-MM-DD sin depender de la zona horaria del servidor */
export function sumarDias(d: string, n: number) {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** Lee ?p=&desde=&hasta=&mdesde=&mhasta= y devuelve el rango (hora de Lima). Por defecto: este mes. */
export function leerFiltroInicio(sp: Record<string, string | undefined>): FiltroInicio {
  const hoy = hoyLima();
  const p = (PERIODOS.some((x) => x.id === sp.p) ? sp.p : "mes") as Periodo;
  let desde = hoy.slice(0, 8) + "01";
  let hasta = hoy;
  if (p === "hoy") desde = hoy;
  if (p === "7d") desde = sumarDias(hoy, -6);
  if (p === "anio") desde = hoy.slice(0, 5) + "01-01";
  if (p === "mes_ant") {
    hasta = sumarDias(desde, -1);
    desde = hasta.slice(0, 8) + "01";
  }
  if (p === "rango") {
    desde = esFecha(sp.desde) ? sp.desde! : desde;
    hasta = esFecha(sp.hasta) ? sp.hasta! : hasta;
    if (desde > hasta) [desde, hasta] = [hasta, desde];
  }
  const nombre = PERIODOS.find((x) => x.id === p)!.texto;
  const etiqueta = p === "hoy" ? `Hoy, ${fecha(`${hoy}T12:00:00-05:00`)}`
    : `${p === "rango" ? "Del" : `${nombre}:`} ${fecha(`${desde}T12:00:00-05:00`)} al ${fecha(`${hasta}T12:00:00-05:00`)}`;
  // Meses de los gráficos: ?mdesde=&mhasta= (o el antiguo ?meses=6|12|24); por defecto los últimos 12
  const actual = hoy.slice(0, 7);
  let { mdesde, mhasta } = rangoMeses(sp.meses === "6" ? "6" : "12", hoy);
  if (sp.meses === "24") mdesde = sumarMeses(actual, -23);
  if (esMes(sp.mdesde)) mdesde = sp.mdesde!;
  if (esMes(sp.mhasta)) mhasta = sp.mhasta!;
  if (mdesde > mhasta) [mdesde, mhasta] = [mhasta, mdesde];
  if (mhasta > actual) mhasta = actual;
  if (mdesde > mhasta) mdesde = mhasta;
  if (mdesde < sumarMeses(mhasta, -35)) mdesde = sumarMeses(mhasta, -35); // máximo 36 meses
  const finMes = sumarDias(`${sumarMeses(mhasta, 1)}-01`, -1);
  // Curva S: ?sdesde=&shasta= (máximo 2 años); por defecto este mes
  let { sdesde, shasta } = rangoCurva("mes", hoy);
  if (esFecha(sp.sdesde)) sdesde = sp.sdesde!;
  if (esFecha(sp.shasta)) shasta = sp.shasta!;
  if (sdesde > shasta) [sdesde, shasta] = [shasta, sdesde];
  if (shasta > hoy) shasta = hoy;
  if (sdesde > shasta) sdesde = shasta;
  if (sdesde < sumarDias(shasta, -730)) sdesde = sumarDias(shasta, -730);
  return { p, desde, hasta, etiqueta, mdesde, mhasta, serieDesde: `${mdesde}-01`, serieHasta: finMes > hoy ? hoy : finMes, sdesde, shasta };
}

type Clave = "p" | "desde" | "hasta" | "mdesde" | "mhasta" | "sdesde" | "shasta";

export function url(f: FiltroInicio, cambios: Partial<Record<Clave, string>>) {
  const q = new URLSearchParams();
  const p = cambios.p ?? f.p;
  if (p !== "mes") q.set("p", p);
  if (p === "rango") {
    q.set("desde", cambios.desde ?? f.desde);
    q.set("hasta", cambios.hasta ?? f.hasta);
  }
  const mdesde = cambios.mdesde ?? f.mdesde;
  const mhasta = cambios.mhasta ?? f.mhasta;
  const def = rangoMeses("12");
  if (mdesde !== def.mdesde || mhasta !== def.mhasta) {
    q.set("mdesde", mdesde);
    q.set("mhasta", mhasta);
  }
  const sdesde = cambios.sdesde ?? f.sdesde;
  const shasta = cambios.shasta ?? f.shasta;
  const defS = rangoCurva("mes");
  if (sdesde !== defS.sdesde || shasta !== defS.shasta) {
    q.set("sdesde", sdesde);
    q.set("shasta", shasta);
  }
  const s = q.toString();
  return s ? `/?${s}` : "/";
}
