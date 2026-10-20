"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { useNotificar } from "@/components/ui/notificaciones";
import { MENSAJE_IMPRESO } from "./auto-imprimir";

/**
 * Imprime el ticket de 80 mm sin salir de la página: lo carga en un iframe oculto que abre el diálogo de
 * impresión por sí solo. En celular/tablet (el iframe no imprime bien) se abre en una pestaña.
 */
export function BotonImprimir80({ href, className }: { href: string; className?: string }) {
  const [cargando, setCargando] = useState(false);
  const marco = useRef<HTMLIFrameElement | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notificar = useNotificar();

  const limpiar = () => {
    clearTimeout(espera.current);
    marco.current?.remove();
    marco.current = null;
    setCargando(false);
  };

  useEffect(() => {
    const alRecibir = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data === MENSAJE_IMPRESO && e.source === marco.current?.contentWindow) limpiar();
    };
    addEventListener("message", alRecibir);
    return () => { removeEventListener("message", alRecibir); limpiar(); };
  }, []);

  function imprimir(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || matchMedia("(pointer: coarse)").matches) return; // pestaña nueva
    e.preventDefault();
    if (cargando) return;
    limpiar();
    setCargando(true);
    const f = document.createElement("iframe");
    f.src = href;
    f.title = "Ticket 80 mm";
    f.setAttribute("aria-hidden", "true");
    // Con ancho real de 80 mm para que el ticket se mida igual que en el papel
    f.style.cssText = "position:fixed;right:0;bottom:0;width:80mm;height:1px;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(f);
    marco.current = f;
    // Si en 25 s no llegó a abrir el diálogo (sin conexión, sesión vencida), se avisa
    espera.current = setTimeout(() => {
      const abrio = marco.current?.contentDocument?.getElementById("ticket");
      if (abrio) return;
      limpiar();
      notificar({ titulo: "No se pudo preparar el ticket. Intente de nuevo.", tono: "error" });
    }, 25_000);
  }

  return (
    <a href={href} target="_blank" onClick={imprimir} aria-busy={cargando} title="Imprimir en la térmica de 80 mm" className={className}>
      {cargando ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
      {cargando ? "Preparando…" : "80 mm"}
    </a>
  );
}
