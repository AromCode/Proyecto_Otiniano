"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNotificar } from "./notificaciones";

/**
 * Descarga de un archivo generado en el servidor (Excel): un <a> normal no da ninguna señal mientras
 * se arma el archivo y parece colgado. Aquí se baja con fetch y el botón muestra "Generando…".
 * Sin JavaScript sigue funcionando como enlace.
 */
export function EnlaceDescarga({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const [cargando, setCargando] = useState(false);
  const notificar = useNotificar();

  async function descargar(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (cargando) return;
    setCargando(true);
    try {
      const resp = await fetch(href);
      if (!resp.ok) throw new Error(resp.status === 403 ? "No tiene permiso para descargar este archivo." : "No se pudo generar el archivo.");
      const nombre = /filename="([^"]+)"/.exec(resp.headers.get("Content-Disposition") ?? "")?.[1] ?? "descarga";
      const url = URL.createObjectURL(await resp.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      notificar({ titulo: err instanceof TypeError ? "Sin conexión: no se pudo descargar." : (err as Error).message, tono: "error" });
    } finally {
      setCargando(false);
    }
  }

  return (
    <a href={href} onClick={descargar} aria-busy={cargando} className={className}>
      {cargando ? <><Loader2 className="size-4 animate-spin" /> Generando…</> : children}
    </a>
  );
}
