"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { Campo } from "@/components/ui/campos";
import { InputClave } from "@/components/ui/input-clave";
import { Aviso } from "@/components/ui/basicos";
import { Boton } from "@/components/ui/boton";
import { useNotificar } from "@/components/ui/notificaciones";
import { MedidorClave } from "@/components/medidor-clave";

export function FormClave() {
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nueva, setNueva] = useState("");
  const notificar = useNotificar();

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
      <MedidorClave clave={nueva} />
      <Campo etiqueta="Repetir contraseña"><InputClave name="repetir" autoComplete="new-password" required /></Campo>
      {error && <div className="animar-sacudir"><Aviso tono="rojo">{error}</Aviso></div>}
      <Boton type="submit" disabled={guardando}>
        {guardando ? <><Loader2 className="size-4 animate-spin" /> Guardando…</> : "Cambiar contraseña"}
      </Boton>
    </form>
  );
}
