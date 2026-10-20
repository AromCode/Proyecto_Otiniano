"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cx } from "@/components/ui/clases";

/** Acceso directo de desarrollo (POST a /auth/dev, que redirige a la pantalla de bienvenida) */
export function BotonDev({ email, principal }: { email: string; principal: boolean }) {
  return (
    <form action="/auth/dev" method="post">
      <input type="hidden" name="email" value={email} />
      <Boton email={email} principal={principal} />
    </form>
  );
}

function Boton({ email, principal }: { email: string; principal: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={cx(
        "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed disabled:opacity-70",
        principal
          ? "border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100"
          : "border-stone-300 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100",
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      <span>
        {pending ? "Entrando…" : `Entrar directo como ${email}`}
        {principal && <span className="block text-xs font-normal text-amber-700">Solo en desarrollo</span>}
      </span>
    </button>
  );
}
