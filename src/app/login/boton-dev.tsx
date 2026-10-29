"use client";

import { useFormStatus } from "react-dom";
import { BriefcaseBusiness, Crown, Loader2, Warehouse, Wrench } from "lucide-react";
import { ACCESOS, LISTA_ACCESOS, type Acceso } from "@/lib/accesos";
import { cx } from "@/components/ui/clases";

const ICONO: Record<Acceso, typeof Crown> = { gerencia: Crown, administracion: BriefcaseBusiness, almacen: Warehouse };

/** Ingreso directo por rol (solo `pnpm dev`): un clic entra con el usuario de prueba de ese rol vía /auth/dev */
export function IngresoPorRol({ usuarios }: { usuarios: Partial<Record<Acceso, string>> }) {
  return (
    <div className="rounded-2xl border border-dashed border-marca-200 bg-marca-50/60 p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-0.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
          <Wrench className="size-4 text-marca-600" /> Ingreso directo por rol
        </p>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-marca-100 px-2.5 py-0.5 text-xs font-semibold text-marca-700">Solo desarrollo</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {LISTA_ACCESOS.map((a) => <Mosaico key={a} acceso={a} email={usuarios[a]} />)}
      </div>
    </div>
  );
}

function Mosaico({ acceso, email }: { acceso: Acceso; email?: string }) {
  return (
    <form action="/auth/dev" method="post">
      <input type="hidden" name="email" value={email ?? ""} />
      <Boton acceso={acceso} email={email} />
    </form>
  );
}

function Boton({ acceso, email }: { acceso: Acceso; email?: string }) {
  const { pending } = useFormStatus();
  const Icono = ICONO[acceso];
  return (
    <button
      disabled={pending || !email}
      title={email ? `Entrar como ${email}` : "No hay usuario de prueba con este rol"}
      className={cx(
        // Celular: filas compactas (icono + nombre); desde sm, mosaicos de tres columnas
        "group flex h-full w-full items-center gap-3 rounded-xl border border-stone-200 bg-superficie px-3 py-2 text-left transition",
        "sm:flex-col sm:gap-2 sm:px-1.5 sm:py-3 sm:text-center",
        "hover:-translate-y-0.5 hover:border-marca-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-500",
        "disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10 bg-gradient-to-br from-[#22c0f8] to-[#1a5ca8] text-white shadow-sm transition group-hover:scale-110">
        {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Icono className="size-[18px]" />}
      </span>
      <span className="text-sm font-semibold leading-tight">
        {ACCESOS[acceso].titulo}
        {!email && <span className="block text-xs font-normal text-stone-500">Sin usuario</span>}
      </span>
    </button>
  );
}
