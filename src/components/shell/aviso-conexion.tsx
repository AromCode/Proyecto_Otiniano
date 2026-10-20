"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useNotificar } from "@/components/ui/notificaciones";

/** En el patio la señal se cae: se avisa antes de que alguien intente guardar sin conexión */
export function AvisoConexion() {
  const [sinConexion, setSinConexion] = useState(false);
  const notificar = useNotificar();

  useEffect(() => {
    const caida = () => setSinConexion(true);
    const vuelta = () => {
      setSinConexion(false);
      notificar({ titulo: "Conexión restablecida", mensaje: "Ya puede seguir trabajando con normalidad." });
    };
    if (!navigator.onLine) caida();
    window.addEventListener("offline", caida);
    window.addEventListener("online", vuelta);
    return () => {
      window.removeEventListener("offline", caida);
      window.removeEventListener("online", vuelta);
    };
  }, [notificar]);

  if (!sinConexion) return null;
  return (
    <div
      role="alert"
      className="no-imprimir animar-entrada fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-4 md:pl-64"
    >
      <p className="flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 shadow-lg">
        <WifiOff className="size-4 shrink-0" />
        Sin conexión. Lo que guarde no se registrará hasta que vuelva la señal.
      </p>
    </div>
  );
}
