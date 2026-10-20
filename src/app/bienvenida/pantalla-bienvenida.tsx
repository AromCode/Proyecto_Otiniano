"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { marcarPestana } from "@/lib/sesion-pestana";

const DURACION_MS = 1600;

export function PantallaBienvenida({ saludo, nombre, empresa, rol, destino }: {
  saludo: string; nombre: string; empresa: string; rol: string; destino: string;
}) {
  const router = useRouter();

  useEffect(() => {
    // Esta pestaña ya pasó por el login: el sistema no la devolverá al login al recargar
    marcarPestana();
    // Mientras se muestra el mensaje se va cargando el sistema; replace: «atrás» no vuelve aquí
    router.prefetch(destino);
    const t = setTimeout(() => router.replace(destino), DURACION_MS);
    return () => clearTimeout(t);
  }, [router, destino]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo px-4">
      <div role="status" aria-live="polite" className="animar-subir w-full max-w-sm rounded-2xl border border-stone-200 bg-superficie p-8 text-center shadow-sm">
        <svg viewBox="0 0 56 56" className="mx-auto size-16" aria-hidden>
          <circle cx="28" cy="28" r="25" fill="none" strokeWidth="3" className="circulo-trazo stroke-emerald-500" strokeLinecap="round" />
          <path d="M17 29l7.5 7.5L39 21" fill="none" strokeWidth="4" className="check-trazo stroke-emerald-500" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-700">Autenticación exitosa</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{saludo}, {nombre}</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
          <Building2 className="size-3.5" /> {empresa} · {rol}
        </p>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div className="barra-llenar h-full rounded-full bg-marca-500" style={{ "--duracion": `${DURACION_MS}ms` } as React.CSSProperties} />
        </div>
        <p className="mt-2 text-xs text-stone-500">Preparando su panel…</p>
      </div>
    </main>
  );
}
