// Cálculos "en vivo" del formulario con enteros (gramos y céntimos) para no arrastrar
// errores de float. El valor oficial lo calcula y guarda la base de datos.

/** "5.250" | "5,250" → gramos (entero) */
export function aGramos(v: string): number {
  const t = normalizar(v);
  if (!t) return 0;
  const [ent, dec = ""] = t.split(".");
  return Number(ent || 0) * 1000 + Number((dec + "000").slice(0, 3));
}

/** "30.5" → céntimos (entero) */
export function aCentimos(v: string): number {
  const t = normalizar(v);
  if (!t) return 0;
  const [ent, dec = ""] = t.split(".");
  return Number(ent || 0) * 100 + Number((dec + "00").slice(0, 2));
}

/** Importe en céntimos = round(gramos × céntimos / 1000), redondeo half-up como Postgres */
export function importeCentimos(gramos: number, centimos: number): number {
  return Math.round((gramos * centimos) / 1000);
}

export const centimosASoles = (c: number) => (c / 100).toFixed(2);
export const gramosAKg = (g: number) => (g / 1000).toFixed(3);

/** Acepta coma o punto decimal; devuelve string limpio con punto o "" */
export function normalizar(v: string): string {
  const t = (v ?? "").toString().trim().replace(",", ".");
  return /^\d*\.?\d*$/.test(t) && t !== "." ? t : "";
}
