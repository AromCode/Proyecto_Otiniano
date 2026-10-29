"use client";

import { useEffect, useRef } from "react";
import { useNotificar, type Notificacion } from "@/components/ui/notificaciones";

/**
 * Avisos al llegar al login (sesión cerrada, enlace vencido, sesión terminada) como notificación flotante
 * que se cierra sola: no empujan la tarjeta. Se quita el parámetro de la URL para que no se repita al recargar.
 */
export function AvisosLogin({ salio, enlaceVencido, sesionTermino }: {
  salio: boolean; enlaceVencido: boolean; sesionTermino: boolean;
}) {
  const notificar = useNotificar();
  const mostrado = useRef(false);

  useEffect(() => {
    if (mostrado.current) return;
    mostrado.current = true;
    const aviso: Notificacion | null = salio
      ? { tono: "exito", titulo: "Sesión cerrada correctamente", mensaje: "¡Hasta pronto!" }
      : enlaceVencido
        ? {
          tono: "aviso", titulo: "El enlace ya no sirve", duracion: 9000,
          mensaje: "Venció, ya se usó o se abrió en otro equipo. Pida uno nuevo con «¿Olvidó su contraseña?» y ábralo en este mismo equipo.",
        }
        : sesionTermino
          ? { tono: "info", titulo: "Ingrese para continuar", mensaje: "Su sesión terminó o aún no ha ingresado. Lo llevaremos donde estaba." }
          : null;
    if (aviso) notificar(aviso);

    const url = new URL(window.location.href);
    url.searchParams.delete("salio");
    url.searchParams.delete("enlace");
    url.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, [salio, enlaceVencido, sesionTermino, notificar]);

  return null;
}
