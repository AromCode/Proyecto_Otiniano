"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, LogIn } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { Campo, Input } from "@/components/ui/campos";
import { InputClave } from "@/components/ui/input-clave";
import { Aviso } from "@/components/ui/basicos";
import { cx } from "@/components/ui/clases";

const CLAVE_CORREO = "metales:correo";

/** Traduce los errores de Supabase Auth a mensajes claros */
function mensajeError(e: { message: string; status?: number }): string {
  const m = e.message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos. Revise e intente de nuevo.";
  if (m.includes("email not confirmed")) return "Su correo aún no está confirmado. Pida al administrador que active su cuenta.";
  if (e.status === 429 || m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos seguidos. Espere un minuto e intente de nuevo.";
  if (m.includes("fetch") || m.includes("network")) return "No hay conexión con el servidor. Revise su internet e intente de nuevo.";
  return e.message;
}

export function FormLogin({ next, errorInicial }: { next: string; errorInicial?: boolean }) {
  const [error, setError] = useState<string | null>(errorInicial ? "Correo o contraseña incorrectos. Revise e intente de nuevo." : null);
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState<"listo" | "enviando" | "exito">("listo");
  const [ayuda, setAyuda] = useState(false);
  const correoRef = useRef<HTMLInputElement>(null);
  const claveRef = useRef<HTMLInputElement>(null);
  const recordarRef = useRef<HTMLInputElement>(null);

  // Si eligió recordar el correo, se completa y el cursor va directo a la contraseña
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_CORREO);
      if (guardado && correoRef.current && !correoRef.current.value) {
        correoRef.current.value = guardado;
        claveRef.current?.focus();
        return;
      }
    } catch { /* sin localStorage */ }
    correoRef.current?.focus();
  }, []);

  async function ingresar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (estado !== "listo") return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim().toLowerCase();
    setEstado("enviando");
    setError(null);
    const { error } = await crearClienteNavegador().auth.signInWithPassword({ email, password: String(fd.get("password")) });
    if (error) {
      setError(mensajeError(error));
      setIntento((n) => n + 1);
      setEstado("listo");
      claveRef.current?.select();
      return;
    }
    try {
      if (recordarRef.current?.checked) localStorage.setItem(CLAVE_CORREO, email);
      else localStorage.removeItem(CLAVE_CORREO);
    } catch { /* sin localStorage */ }
    setEstado("exito");
    // Pantalla de «autenticación exitosa»; desde ahí se abre el sistema ya cargado
    window.location.assign(`/bienvenida?next=${encodeURIComponent(next)}`);
  }

  const ocupado = estado !== "listo";

  return (
    // method/action: si se envía antes de que cargue JavaScript, va por POST al servidor (nunca en la URL)
    <form onSubmit={ingresar} method="post" action="/auth/ingresar" className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <fieldset disabled={ocupado} className="space-y-4">
        <Campo etiqueta="Correo">
          <Input ref={correoRef} name="email" type="email" inputMode="email" autoComplete="username" placeholder="nombre@empresa.pe" required />
        </Campo>
        <Campo etiqueta="Contraseña">
          <InputClave ref={claveRef} name="password" autoComplete="current-password" placeholder="Su contraseña" required />
        </Campo>
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-stone-600">
            <input ref={recordarRef} type="checkbox" defaultChecked className="size-4 accent-marca-600" />
            Recordar mi correo
          </label>
          <button type="button" onClick={() => setAyuda((v) => !v)} className="font-medium text-marca-700 hover:underline" aria-expanded={ayuda}>
            ¿Olvidó su contraseña?
          </button>
        </div>
      </fieldset>

      {ayuda && (
        <Aviso tono="azul">
          Pida al dueño o administrador que le asigne una nueva contraseña. Cuando ingrese, puede cambiarla en <b>Mi cuenta</b>.
        </Aviso>
      )}
      {error && (
        <div key={intento} className="animar-sacudir">
          <Aviso tono="rojo">{error}</Aviso>
        </div>
      )}

      <Boton
        type="submit"
        disabled={ocupado}
        tamano="lg"
        className={cx("w-full", estado === "exito" && "!bg-emerald-600 !opacity-100")}
      >
        {estado === "enviando" && <><Loader2 className="size-5 animate-spin" /> Verificando…</>}
        {estado === "exito" && <><CheckCircle2 className="size-5" /> Acceso correcto</>}
        {estado === "listo" && <><LogIn className="size-5" /> Ingresar</>}
      </Boton>
    </form>
  );
}
