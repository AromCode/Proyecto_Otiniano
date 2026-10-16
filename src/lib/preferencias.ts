// Preferencias de vista por dispositivo (cookies legibles por el servidor para no parpadear al cargar).
export const COOKIE_TEMA = "tema";
export const COOKIE_LETRA = "letra";

export type Tema = "auto" | "claro" | "oscuro";
export type Letra = "normal" | "grande";

export const leerTema = (v: string | undefined): Tema => (v === "claro" || v === "oscuro" ? v : "auto");
export const leerLetra = (v: string | undefined): Letra => (v === "grande" ? "grande" : "normal");

/** Clases que van en <html> */
export function clasesHtml(tema: Tema, letra: Letra): string {
  return [tema !== "auto" ? tema : "", letra === "grande" ? "letra-grande" : ""].filter(Boolean).join(" ");
}
