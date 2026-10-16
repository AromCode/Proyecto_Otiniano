"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { Campo, Input } from "@/components/ui/campos";
import { Aviso } from "@/components/ui/basicos";

export function FormLogin({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setCargando(true);
    setError(null);
    const { error } = await crearClienteNavegador().auth.signInWithPassword({
      email: String(fd.get("email")).trim(),
      password: String(fd.get("password")),
    });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
      setCargando(false);
      return;
    }
    window.location.assign(next);
  }

  return (
    <form onSubmit={ingresar} className="space-y-4">
      <Campo etiqueta="Correo">
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Campo>
      <Campo etiqueta="Contraseña">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Campo>
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <Boton type="submit" disabled={cargando} className="w-full" tamano="lg">
        {cargando ? "Ingresando…" : "Ingresar"}
      </Boton>
    </form>
  );
}
