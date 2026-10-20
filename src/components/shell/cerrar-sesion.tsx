"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, LogOut } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";

/**
 * Cerrar sesión en tres pasos: confirmar → pantalla «Cerrando sesión…» → login con el aviso
 * «Sesión cerrada correctamente». Sin JavaScript sigue funcionando (es un form POST normal).
 */
export function BotonCerrarSesion({ nombre, className }: { nombre?: string; className?: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  function salir() {
    setConfirmar(false);
    setSaliendo(true);
    // Un instante para que se lea el mensaje; submit() no vuelve a pasar por onSubmit
    setTimeout(() => form.current?.submit(), 650);
  }

  return (
    <>
      <form ref={form} action="/auth/salir" method="post" onSubmit={(e) => { e.preventDefault(); setConfirmar(true); }}>
        <button className={className ?? "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-stone-600 hover:bg-red-50 hover:text-red-700"}>
          <LogOut className="size-4" /> Cerrar sesión
        </button>
      </form>

      <Modal abierto={confirmar} onCerrar={() => setConfirmar(false)} titulo="¿Cerrar sesión?" ancho="max-w-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <LogOut className="size-5" />
          </span>
          <p className="text-sm text-stone-600">
            Saldrá del sistema en este dispositivo. Para volver a entrar necesitará su correo y contraseña.
          </p>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="secundario" onClick={() => setConfirmar(false)} autoFocus>Cancelar</Boton>
          <Boton variante="peligro" onClick={salir}><LogOut className="size-4" /> Sí, cerrar sesión</Boton>
        </div>
      </Modal>

      {saliendo && createPortal(
        <div role="status" aria-live="assertive" className="animar-aparecer fixed inset-0 z-[100] flex items-center justify-center bg-fondo/95 px-4 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="mx-auto size-9 animate-spin text-marca-600" />
            <p className="mt-4 text-lg font-semibold">Cerrando sesión…</p>
            <p className="mt-1 text-sm text-stone-500">{nombre ? `Hasta pronto, ${nombre}.` : "Hasta pronto."}</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
