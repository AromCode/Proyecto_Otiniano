"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { Campo } from "@/components/ui/campos";
import { InputClave } from "@/components/ui/input-clave";
import { Aviso } from "@/components/ui/basicos";
import { Boton } from "@/components/ui/boton";
import { useNotificar } from "@/components/ui/notificaciones";
import { cx } from "@/components/ui/clases";

/** Qué tan segura es la contraseña: largo, mayúsculas/minúsculas, números y símbolos */
function fuerza(clave: string): { nivel: 0 | 1 | 2 | 3; texto: string } {
  if (!clave) return { nivel: 0, texto: "" };
  if (clave.length < 8) return { nivel: 1, texto: "Muy corta: use al menos 8 caracteres" };
  const variedad = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(clave)).length;
  if (clave.length >= 12 && variedad >= 3) return { nivel: 3, texto: "Segura" };
  return variedad >= 2 ? { nivel: 2, texto: "Aceptable: agregue números o símbolos para mejorarla" } : { nivel: 1, texto: "Débil: mezcle letras, números y símbolos" };
}

export function FormClave() {
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nueva, setNueva] = useState("");
  const notificar = useNotificar();
  const f = fuerza(nueva);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const clave = String(fd.get("nueva"));
    if (clave.length < 8) return setError("Use al menos 8 caracteres.");
    if (clave !== String(fd.get("repetir"))) return setError("Las contraseñas no coinciden.");
    setError(null);
    setGuardando(true);
    const { error } = await crearClienteNavegador().auth.updateUser({ password: clave });
    setGuardando(false);
    if (error) {
      return setError(error.message.toLowerCase().includes("different from the old")
        ? "La nueva contraseña debe ser distinta de la actual."
        : error.message);
    }
    form.reset();
    setNueva("");
    notificar({ titulo: "Contraseña actualizada", mensaje: "Úsela la próxima vez que ingrese." });
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <Campo etiqueta="Nueva contraseña">
        <InputClave name="nueva" autoComplete="new-password" required minLength={8} onChange={(e) => setNueva(e.target.value)} />
      </Campo>
      {f.nivel > 0 && (
        <div aria-live="polite">
          <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3].map((n) => (
              <span key={n} className={cx("h-1.5 rounded-full", n <= f.nivel
                ? f.nivel === 1 ? "bg-red-500" : f.nivel === 2 ? "bg-amber-500" : "bg-emerald-500"
                : "bg-stone-200")} />
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500">{f.texto}</p>
        </div>
      )}
      <Campo etiqueta="Repetir contraseña"><InputClave name="repetir" autoComplete="new-password" required /></Campo>
      {error && <div className="animar-sacudir"><Aviso tono="rojo">{error}</Aviso></div>}
      <Boton type="submit" disabled={guardando}>
        {guardando ? <><Loader2 className="size-4 animate-spin" /> Guardando…</> : "Cambiar contraseña"}
      </Boton>
    </form>
  );
}
