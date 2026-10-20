"use client";

import { useEffect, useState } from "react";
import { Download, MonitorDown, Share, SquarePlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { cx } from "@/components/ui/clases";
import { useNotificar } from "@/components/ui/notificaciones";

// Botón "Instalar" de la barra superior: instala el sistema como aplicación (PWA) en la PC, laptop o celular.
// Chrome/Edge: abre el instalador del navegador. Safari, Firefox u otros sin instalador: explica los pasos.
// Ya instalada (abierta como app): no se muestra.

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Plataforma = "ios" | "mac-safari" | "android" | "pc";

function plataforma(): Plataforma {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua)) return "mac-safari";
  if (/Android/.test(ua)) return "android";
  return "pc";
}

const esApp = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function BotonInstalar({ className }: { className?: string }) {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [visible, setVisible] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const notificar = useNotificar();

  useEffect(() => {
    // Solo en producción: en pnpm dev el caché de archivos estáticos daría código viejo
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
      else navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    }
    if (esApp()) return;
    setVisible(true);
    // Oferta que llegó antes de montar el botón (la guarda el script de app/layout.tsx)
    const previa = (window as Window & { __instalar?: EventoInstalar }).__instalar;
    if (previa) setEvento(previa);
    const alOfrecer = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); };
    const alInstalar = () => {
      setVisible(false);
      setEvento(null);
      notificar({ tono: "exito", titulo: "Sistema Otiniano instalado", mensaje: "Ya puede abrirlo desde el escritorio o el menú de inicio." });
    };
    window.addEventListener("beforeinstallprompt", alOfrecer);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alOfrecer);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, [notificar]);

  if (!visible) return null;

  async function instalar() {
    if (!evento) return setAyuda(true);
    await evento.prompt();
    await evento.userChoice;
    // Cada oferta se usa una sola vez; si la rechazó, la próxima vez se muestran los pasos
    (window as Window & { __instalar?: EventoInstalar }).__instalar = undefined;
    setEvento(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={instalar}
        title="Instalar el Sistema Otiniano en este equipo (acceso directo en el escritorio)"
        aria-label="Instalar aplicación"
        className={cx(
          "flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-marca-700 hover:bg-marca-50 sm:border sm:border-marca-200 sm:px-3",
          className,
        )}
      >
        <MonitorDown className="size-[18px] shrink-0" />
        <span className="hidden sm:inline">Instalar</span>
      </button>

      <Modal abierto={ayuda} onCerrar={() => setAyuda(false)} titulo="Instalar Sistema Otiniano" ancho="max-w-md">
        <Pasos />
        <div className="mt-5 flex justify-end">
          <Boton onClick={() => setAyuda(false)}>Entendido</Boton>
        </div>
      </Modal>
    </>
  );
}

/** Pasos según el navegador cuando no hay instalador automático */
function Pasos() {
  const p = plataforma();
  const paso = (n: number, texto: React.ReactNode) => (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marca-100 text-xs font-bold text-marca-700">{n}</span>
      <span className="pt-0.5">{texto}</span>
    </li>
  );
  return (
    <div className="space-y-4 text-sm text-stone-700">
      <p>Queda como una aplicación más: con su ícono en el escritorio o en la pantalla de inicio y en su propia ventana.</p>
      <ol className="space-y-2.5">
        {p === "ios" && (
          <>
            {paso(1, <>Abra esta página en <b>Safari</b>.</>)}
            {paso(2, <>Toque <b>Compartir</b> <Share className="inline size-4 align-text-bottom" />.</>)}
            {paso(3, <>Elija <b>Agregar a inicio</b> <SquarePlus className="inline size-4 align-text-bottom" /> y luego <b>Agregar</b>.</>)}
          </>
        )}
        {p === "mac-safari" && (
          <>
            {paso(1, <>En la barra de menú, abra <b>Archivo</b>.</>)}
            {paso(2, <>Elija <b>Agregar al Dock…</b> y confirme con <b>Agregar</b>.</>)}
          </>
        )}
        {p === "android" && (
          <>
            {paso(1, <>Abra esta página en <b>Chrome</b>.</>)}
            {paso(2, <>Toque el menú <b>⋮</b> (arriba a la derecha).</>)}
            {paso(3, <>Elija <b>Instalar aplicación</b> o <b>Agregar a la pantalla principal</b>.</>)}
          </>
        )}
        {p === "pc" && (
          <>
            {paso(1, <>Abra esta página en <b>Google Chrome</b> o <b>Microsoft Edge</b> (Firefox no instala aplicaciones).</>)}
            {paso(2, <>En la barra de direcciones, haga clic en el ícono de instalar <Download className="inline size-4 align-text-bottom" />, o abra el menú <b>⋮</b> / <b>…</b>.</>)}
            {paso(3, <>Elija <b>Instalar Otiniano</b> (en Edge: <b>Aplicaciones → Instalar este sitio como aplicación</b>).</>)}
          </>
        )}
      </ol>
      <p className="text-xs text-stone-500">Si ya la instaló, ábrala desde su ícono: dentro de la aplicación este botón no aparece.</p>
    </div>
  );
}
