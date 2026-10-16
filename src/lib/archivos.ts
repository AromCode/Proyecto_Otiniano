"use client";

import { crearClienteNavegador } from "./supabase/client";

/**
 * Sube un archivo al bucket privado "archivos" en {empresa}/{carpeta}/{uuid}.{ext}.
 * Las imágenes grandes se reducen a 1600 px para que suban rápido con datos móviles.
 * Devuelve la ruta (no una URL pública): se ve con una URL firmada.
 */
export async function subirArchivo(empresaId: string, carpeta: string, archivo: File): Promise<string> {
  const final = archivo.type.startsWith("image/") && archivo.type !== "image/heic"
    ? await reducirImagen(archivo)
    : archivo;
  const ext = final.type === "application/pdf" ? "pdf" : final.type === "image/png" ? "png" : "jpg";
  const ruta = `${empresaId}/${carpeta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await crearClienteNavegador().storage.from("archivos").upload(ruta, final, {
    contentType: final.type,
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);
  return ruta;
}

async function reducirImagen(archivo: File, max = 1600): Promise<File> {
  try {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (escala === 1 && archivo.size < 800_000) return archivo;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : archivo;
  } catch {
    return archivo;
  }
}
