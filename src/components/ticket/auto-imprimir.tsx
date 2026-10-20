"use client";

import { useEffect } from "react";

export const MENSAJE_IMPRESO = "otiniano:ticket-impreso";
const PX_POR_MM = 96 / 25.4;

/**
 * Espera fuentes y logo, mide el ticket y fija `@page` a 80 mm × su alto exacto (margen 0, sin encabezados
 * del navegador). Luego abre el diálogo de impresión y avisa a la página que lo pidió (BotonImprimir80).
 */
export function AutoImprimir() {
  useEffect(() => {
    let cancelado = false;
    (async () => {
      await document.fonts?.ready;
      await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {})));
      const ticket = document.getElementById("ticket");
      if (!ticket || cancelado) return;
      const alto = Math.ceil(ticket.getBoundingClientRect().height / PX_POR_MM) + 1;
      const estilo = document.createElement("style");
      estilo.textContent = `@page{size:80mm ${alto}mm;margin:0}`;
      document.head.appendChild(estilo);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelado) return;
      // Se avisa al cerrar el diálogo (imprimir o cancelar): recién ahí la página puede quitar el iframe
      if (window.parent !== window) {
        addEventListener("afterprint", () => window.parent.postMessage(MENSAJE_IMPRESO, location.origin), { once: true });
      }
      window.print();
    })();
    return () => { cancelado = true; };
  }, []);
  return null;
}
