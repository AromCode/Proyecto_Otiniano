import "server-only";
import type { Contexto } from "./contexto";

/** URL firmada (1 hora) para ver un archivo privado del bucket "archivos". */
export async function urlArchivo(supabase: Contexto["supabase"], ruta: string | null | undefined) {
  if (!ruta) return null;
  if (/^https?:\/\//.test(ruta)) return ruta;
  const { data } = await supabase.storage.from("archivos").createSignedUrl(ruta, 3600);
  return data?.signedUrl ?? null;
}

/** Logo de la empresa para PDF/Excel, solo si es PNG o JPG (react-pdf no dibuja otros formatos) */
export async function cargarLogo(supabase: Contexto["supabase"], ruta: string | null | undefined) {
  try {
    const url = await urlArchivo(supabase, ruta);
    if (!url) return null;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !/image\/(png|jpe?g)/.test(tipo)) return null;
    return { buffer: Buffer.from(await r.arrayBuffer()), ext: tipo.includes("png") ? ("png" as const) : ("jpeg" as const) };
  } catch {
    return null;
  }
}
