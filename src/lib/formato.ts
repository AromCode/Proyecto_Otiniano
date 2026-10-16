// Formato es-PE. Los valores llegan de Postgres como string (numeric) y solo se formatean.
const fmtSoles = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtNum = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

type Num = string | number | null | undefined;
const n = (v: Num) => (v === null || v === undefined || v === "" ? 0 : Number(v));

export const soles = (v: Num) => `S/ ${fmtSoles.format(n(v))}`;
export const kg = (v: Num) => `${fmtKg.format(n(v))} kg`;
export const numero = (v: Num) => fmtNum.format(n(v));
export const porcentaje = (v: Num) => `${fmtNum.format(n(v))} %`;

const TZ = "America/Lima";
export const fecha = (v: string | Date | null | undefined) =>
  v ? new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeZone: TZ }).format(new Date(v)) : "—";
export const fechaHora = (v: string | Date | null | undefined) =>
  v ? new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: TZ }).format(new Date(v)) : "—";

/** YYYY-MM-DD de hoy en Lima */
export function hoyLima(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}
export function inicioMesLima(): string {
  return hoyLima().slice(0, 8) + "01";
}
export function periodoActual(): string {
  return hoyLima().slice(0, 7);
}
export function nombrePeriodo(p: string): string {
  const [a, m] = p.split("-").map(Number);
  const s = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(a, m - 1, 15)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const ETIQUETA_ROL: Record<string, string> = {
  dueno: "Dueño", socio: "Socio", cajero: "Cajero", balancero: "Balancero",
};
export const ETIQUETA_MEDIO: Record<string, string> = {
  efectivo: "Efectivo", yape: "Yape", plin: "Plin", transferencia: "Transferencia",
};
export const ETIQUETA_ORIGEN: Record<string, string> = {
  compra: "Compra", venta: "Venta", gasto: "Gasto", aporte: "Aporte", retiro: "Retiro",
  traspaso: "Traspaso", ajuste: "Ajuste", saldo_inicial: "Saldo inicial",
};
