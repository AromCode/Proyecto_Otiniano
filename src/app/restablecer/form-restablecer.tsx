"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { Campo } from "@/components/ui/campos";
import { InputClave } from "@/components/ui/input-clave";
import { useNotificar } from "@/components/ui/notificaciones";
import { Boton } from "@/components/ui/boton";
import { MedidorClave } from "@/components/medidor-clave";
import { cx } from "@/components/ui/clases";

export function FormRestablecer({ correo }: { correo: string }) {
  const notificar = useNotificar();
  const [estado, setEstado] = useState<"listo" | "guardando" | "exito">("listo");
  const [nueva, setNueva] = useState("");

  // Errores como aviso flotante: la tarjeta no cambia de alto
  function fallar(mensaje: string) {
    notificar({ tono: "error", titulo: "No se pudo guardar", mensaje });
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const clave = String(fd.get("nueva"));
    if (clave.length < 8) return fallar("Use al menos 8 caracteres.");
    if (clave !== String(fd.get("repetir"))) return fallar("Las contraseñas no coinciden.");
    setEstado("guardando");
    const { error } = await crearClienteNavegador().auth.updateUser({ password: clave });
    if (error) {
      const m = error.message.toLowerCase();
      // La sesión del enlace caducó: se pide uno nuevo desde el login
      if (m.includes("session")) return window.location.assign("/login?enlace=vencido");
      setEstado("listo");
      if (m.includes("different from the old")) return fallar("La nueva contraseña debe ser distinta de la anterior.");
      console.error(error);
      return fallar("No se pudo guardar la contraseña. Intente de nuevo o avise al administrador.");
    }
    setEstado("exito");
    // Ya tiene sesión: pasa por la bienvenida y entra al sistema
    window.location.assign("/bienvenida");
  }

  return (
    <form onSubmit={guardar} className="paso-adelante space-y-4">
      <div>
        <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c0f8] to-[#1a5ca8] text-white shadow-sm">
          <KeyRound className="size-5" />
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Cree su nueva contraseña</h1>
        {correo && <p className="mt-1 text-sm text-stone-500">Para <b className="font-medium text-stone-700">{correo}</b></p>}
      </div>
      <fieldset disabled={estado !== "listo"} className="space-y-4">
        <Campo etiqueta="Nueva contraseña">
          <InputClave name="nueva" autoComplete="new-password" required minLength={8} autoFocus onChange={(e) => setNueva(e.target.value)} />
        </Campo>
        <MedidorClave clave={nueva} />
        <Campo etiqueta="Repetir contraseña"><InputClave name="repetir" autoComplete="new-password" required /></Campo>
      </fieldset>
      <Boton type="submit" disabled={estado !== "listo"} tamano="lg"
        aria-busy={estado === "guardando"}
        className={cx("w-full", estado !== "listo" && "cursor-progress !opacity-100", estado === "exito" && "!bg-[#047857]")}>
        {estado === "guardando" && <><Loader2 className="size-5 animate-spin" /> Guardando…</>}
        {estado === "exito" && <><CheckCircle2 className="size-5" /> Contraseña guardada</>}
        {estado === "listo" && "Guardar e ingresar"}
      </Boton>
    </form>
  );
}
