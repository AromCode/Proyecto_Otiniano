"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { Campo, Input } from "@/components/ui/campos";
import { Aviso } from "@/components/ui/basicos";
import { Boton } from "@/components/ui/boton";

export function FormClave() {
  const [estado, setEstado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const nueva = String(fd.get("nueva"));
    if (nueva.length < 8) return setEstado({ ok: false, msg: "Use al menos 8 caracteres." });
    if (nueva !== String(fd.get("repetir"))) return setEstado({ ok: false, msg: "Las contraseñas no coinciden." });
    setGuardando(true);
    const { error } = await crearClienteNavegador().auth.updateUser({ password: nueva });
    setGuardando(false);
    if (error) return setEstado({ ok: false, msg: error.message });
    form.reset();
    setEstado({ ok: true, msg: "Contraseña actualizada. Úsela la próxima vez que ingrese." });
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <Campo etiqueta="Nueva contraseña"><Input name="nueva" type="password" autoComplete="new-password" required /></Campo>
      <Campo etiqueta="Repetir contraseña"><Input name="repetir" type="password" autoComplete="new-password" required /></Campo>
      {estado && <Aviso tono={estado.ok ? "verde" : "rojo"}>{estado.msg}</Aviso>}
      <Boton type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Cambiar contraseña"}</Boton>
    </form>
  );
}
