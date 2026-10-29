"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cx } from "./clases";

/**
 * Notificaciones flotantes ("toasts") para confirmar lo que pasó: guardado, anulado, error de red…
 * Se cierran solas; las de error duran más. `notificarDespues` las deja guardadas para mostrarlas
 * tras una recarga completa de la página (p. ej. después de cambiar de empresa).
 */
export type TonoNotificacion = "exito" | "error" | "info" | "aviso";
export interface Notificacion { titulo: string; mensaje?: string; tono?: TonoNotificacion; duracion?: number }
type Activa = Notificacion & { id: number; saliendo?: boolean };

const CLAVE_PENDIENTE = "metales:notificacion";
const Ctx = createContext<(n: Notificacion) => void>(() => {});

export function useNotificar() {
  return useContext(Ctx);
}

export function notificarDespues(n: Notificacion) {
  try { sessionStorage.setItem(CLAVE_PENDIENTE, JSON.stringify(n)); } catch { /* modo privado: se omite */ }
}

const ESTILO: Record<TonoNotificacion, { icono: typeof Info; clase: string; iconoClase: string }> = {
  exito: { icono: CheckCircle2, clase: "border-emerald-200", iconoClase: "text-emerald-600" },
  error: { icono: XCircle, clase: "border-red-200", iconoClase: "text-red-600" },
  info: { icono: Info, clase: "border-marca-200", iconoClase: "text-marca-600" },
  aviso: { icono: TriangleAlert, clase: "border-amber-200", iconoClase: "text-amber-600" },
};

export function ProveedorNotificaciones({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<Activa[]>([]);
  const siguiente = useRef(1);

  const cerrar = useCallback((id: number) => {
    setLista((l) => l.map((n) => (n.id === id ? { ...n, saliendo: true } : n)));
    setTimeout(() => setLista((l) => l.filter((n) => n.id !== id)), 200);
  }, []);

  const notificar = useCallback((n: Notificacion) => {
    const id = siguiente.current++;
    const tono = n.tono ?? "exito";
    setLista((l) => [...l.slice(-2), { ...n, tono, id }]);
    setTimeout(() => cerrar(id), n.duracion ?? (tono === "error" ? 7000 : 4000));
  }, [cerrar]);

  useEffect(() => {
    try {
      const pendiente = sessionStorage.getItem(CLAVE_PENDIENTE);
      if (!pendiente) return;
      sessionStorage.removeItem(CLAVE_PENDIENTE);
      notificar(JSON.parse(pendiente) as Notificacion);
    } catch { /* sin sessionStorage */ }
  }, [notificar]);

  return (
    <Ctx.Provider value={notificar}>
      {children}
      <div
        aria-live="polite"
        className="no-imprimir pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end"
      >
        {lista.map((n) => {
          const e = ESTILO[n.tono ?? "exito"];
          return (
            <div
              key={n.id}
              role={n.tono === "error" ? "alert" : "status"}
              className={cx(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-superficie p-3 pr-2 shadow-lg",
                e.clase, n.saliendo ? "animar-salida" : "animar-entrada",
              )}
            >
              <e.icono className={cx("mt-0.5 size-5 shrink-0", e.iconoClase)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900">{n.titulo}</p>
                {n.mensaje && <p className="mt-0.5 text-sm text-stone-600">{n.mensaje}</p>}
              </div>
              <button
                type="button"
                onClick={() => cerrar(n.id)}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                aria-label="Cerrar aviso"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
