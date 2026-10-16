import "server-only";
import type { Contexto } from "./contexto";

/** URL firmada (1 hora) para ver un archivo privado del bucket "archivos". */
export async function urlArchivo(supabase: Contexto["supabase"], ruta: string | null | undefined) {
  if (!ruta) return null;
  if (/^https?:\/\//.test(ruta)) return ruta;
  const { data } = await supabase.storage.from("archivos").createSignedUrl(ruta, 3600);
  return data?.signedUrl ?? null;
}
