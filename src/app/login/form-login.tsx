"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, LogIn, MailCheck } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { Campo, Input } from "@/components/ui/campos";
import { InputClave } from "@/components/ui/input-clave";
import { useNotificar } from "@/components/ui/notificaciones";
import { cx } from "@/components/ui/clases";

const CLAVE_CORREO = "metales:correo";
const MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos. Revise e intente de nuevo.";
// Campos marcados en rojo tras un error (sin cambiar el alto de la tarjeta)
const CLASE_INVALIDO = "aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-100";
type Paso = "credenciales" | "recuperar" | "enviado";

/** Traduce los errores de Supabase Auth a mensajes claros */
function mensajeError(e: { message: string; status?: number }): string {
  const m = e.message.toLowerCase();
  if (m.includes("invalid login credentials")) return MENSAJE_CREDENCIALES;
  if (m.includes("email not confirmed")) return "Su correo aún no está confirmado. Pida al administrador que active su cuenta.";
  if (e.status === 429 || m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos seguidos. Espere un minuto e intente de nuevo.";
  if (m.includes("fetch") || m.includes("network")) return "No hay conexión con el servidor. Revise su internet e intente de nuevo.";
  console.error(e);
  return "No se pudo completar. Intente de nuevo o avise al administrador.";
}

function leer(clave: string) {
  try { return localStorage.getItem(clave); } catch { return null; }
}
function guardar(clave: string, valor: string | null) {
  try {
    if (valor) localStorage.setItem(clave, valor);
    else localStorage.removeItem(clave);
  } catch { /* sin localStorage */ }
}

export function FormLogin({ next, errorInicial, ingresoDirecto }: {
  next: string; errorInicial?: boolean; ingresoDirecto?: React.ReactNode;
}) {
  const [paso, setPaso] = useState<Paso>("credenciales");
  const [atras, setAtras] = useState(false);
  const [correo, setCorreo] = useState("");
  const [invalido, setInvalido] = useState(!!errorInicial);
  const [intento, setIntento] = useState(0);
  const notificar = useNotificar();
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"listo" | "enviando" | "exito">("listo");
  const claveRef = useRef<HTMLInputElement>(null);
  const recordarRef = useRef<HTMLInputElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const primeraVez = useRef(true);

  // Si eligió recordar el correo, se completa (sin pisar lo que ya escribió o rellenó el navegador)
  // y el cursor va directo a la contraseña
  useEffect(() => {
    const c = leer(CLAVE_CORREO);
    if (!c) return;
    setCorreo((previo) => previo || c);
    const activo = document.activeElement as HTMLInputElement | null;
    if (!activo || activo === document.body || activo.name === "email") claveRef.current?.focus();
  }, []);

  // Envío sin JavaScript que volvió con ?error=1: mismo aviso flotante
  const avisoInicial = useRef(false);
  useEffect(() => {
    if (!errorInicial || avisoInicial.current) return;
    avisoInicial.current = true;
    notificar({ tono: "error", titulo: "No se pudo ingresar", mensaje: MENSAJE_CREDENCIALES });
  }, [errorInicial, notificar]);

  // Tras un error: el campo ya está habilitado de nuevo, se selecciona la contraseña para reescribirla
  useEffect(() => {
    if (intento > 0 && paso === "credenciales") claveRef.current?.select();
  }, [intento, paso]);

  // Al cambiar de paso el botón pulsado desaparece: el foco va al título (lector de pantalla) o a la contraseña
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (paso === "credenciales") claveRef.current?.focus();
    else tituloRef.current?.focus();
  }, [paso]);

  function ir(p: Paso, haciaAtras = false) {
    setAtras(haciaAtras);
    setInvalido(false);
    setPaso(p);
  }

  // Errores: aviso flotante + sacudida corta de la tarjeta. Nada se inserta en la tarjeta, así no cambia
  // de alto ni aparece scroll.
  function fallar(titulo: string, mensaje: string) {
    notificar({ tono: "error", titulo, mensaje });
    setInvalido(true);
    setIntento((n) => n + 1);
    setEstado("listo");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      tarjetaRef.current?.animate(
        [{ transform: "none" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" },
          { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }],
        { duration: 400, easing: "ease-in-out" },
      );
    }
  }

  async function ingresar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (estado !== "listo") return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim().toLowerCase();
    setEstado("enviando");
    setInvalido(false);
    const { error } = await crearClienteNavegador().auth.signInWithPassword({ email, password: String(fd.get("password")) });
    if (error) return fallar("No se pudo ingresar", mensajeError(error));

    guardar(CLAVE_CORREO, recordarRef.current?.checked ? email : null);
    setEstado("exito");
    // Pantalla de «autenticación exitosa»; desde ahí se abre el sistema ya cargado
    window.location.assign(`/bienvenida?next=${encodeURIComponent(next)}`);
  }

  async function recuperar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (estado !== "listo") return;
    const email = String(new FormData(e.currentTarget).get("email")).trim().toLowerCase();
    setEstado("enviando");
    setInvalido(false);
    const { error } = await crearClienteNavegador().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirmar?next=/restablecer`,
    });
    // Por privacidad no se dice si el correo existe: solo se informan errores de envío
    if (error && (error.status === 429 || /rate limit|fetch|network/i.test(error.message))) {
      return fallar("No se pudo enviar el enlace", mensajeError(error));
    }
    setEstado("listo");
    ir("enviado");
  }

  const ocupado = estado !== "listo";
  const animacion = atras ? "paso-atras" : "paso-adelante";

  if (paso === "recuperar") {
    return (
      <div key="recuperar" ref={tarjetaRef}>
      <form onSubmit={recuperar} className={cx(animacion, "space-y-4")}>
        <button type="button" onClick={() => ir("credenciales", true)} className="-ml-2 flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-stone-500 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-500">
          <ArrowLeft className="size-4" /> Volver
        </button>
        <div>
          <span className="flex size-11 items-center justify-center rounded-xl bg-marca-50 text-marca-700">
            <KeyRound className="size-5" />
          </span>
          <h1 ref={tituloRef} tabIndex={-1} className="mt-3 text-2xl font-semibold tracking-tight outline-none">¿Olvidó su contraseña?</h1>
          <p className="mt-1 text-sm text-stone-500">Escriba su correo y le enviaremos un enlace para crear una nueva.</p>
        </div>
        <fieldset disabled={ocupado}>
          <Campo etiqueta="Correo">
            <Input name="email" type="email" inputMode="email" autoComplete="username" placeholder="nombre@empresa.pe"
              value={correo} onChange={(e) => { setCorreo(e.target.value); setInvalido(false); }} required
              aria-invalid={invalido} className={CLASE_INVALIDO} />
          </Campo>
        </fieldset>
        <Boton type="submit" disabled={ocupado} tamano="lg" className="w-full">
          {ocupado ? <><Loader2 className="size-5 animate-spin" /> Enviando…</> : "Enviar enlace"}
        </Boton>
        <p className="text-center text-xs text-stone-500">¿No le llega? Gerencia también puede asignarle una contraseña nueva.</p>
      </form>
      </div>
    );
  }

  if (paso === "enviado") {
    return (
      <div key="enviado" className={cx(animacion, "text-center")}>
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <MailCheck className="size-7" />
        </span>
        <h1 ref={tituloRef} tabIndex={-1} className="mt-4 text-xl font-semibold tracking-tight outline-none">Revise su correo</h1>
        <p className="mt-2 text-sm text-stone-600">
          Si <b className="font-semibold">{correo}</b> está registrado, en unos minutos le llegará un enlace para crear su nueva contraseña.
          Revise también la carpeta de spam.
        </p>
        <Boton onClick={() => ir("credenciales", true)} variante="secundario" className="mt-6 w-full">
          <ArrowLeft className="size-4" /> Volver a ingresar
        </Boton>
      </div>
    );
  }

  return (
    <div key="credenciales" ref={tarjetaRef} className={cx(animacion, "space-y-5")}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ingresar</h1>
        <p className="mt-1 text-sm text-stone-500">
          Use el correo y la contraseña que le entregó el administrador. El sistema lo lleva a su panel según su rol.
        </p>
      </div>

      {ingresoDirecto && (
        <>
          {ingresoDirecto}
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span className="h-px flex-1 bg-stone-300" /> o con correo y contraseña <span className="h-px flex-1 bg-stone-300" />
          </div>
        </>
      )}

      {/* method/action: si se envía antes de que cargue JavaScript, va por POST al servidor (nunca en la URL) */}
      <form onSubmit={ingresar} method="post" action="/auth/ingresar" className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <fieldset disabled={ocupado} className="space-y-4">
          <Campo etiqueta="Correo">
            <Input name="email" type="email" inputMode="email" autoComplete="username" placeholder="nombre@empresa.pe"
              value={correo} onChange={(e) => { setCorreo(e.target.value); setInvalido(false); }} required autoFocus
              aria-invalid={invalido} className={CLASE_INVALIDO} />
          </Campo>
          <Campo etiqueta="Contraseña">
            <InputClave ref={claveRef} name="password" autoComplete="current-password" placeholder="Su contraseña" required
              aria-invalid={invalido} className={CLASE_INVALIDO} onChange={() => setInvalido(false)} />
          </Campo>
          <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-stone-600">
              <input ref={recordarRef} type="checkbox" defaultChecked className="size-5 accent-marca-600" />
              Recordarme
            </label>
            <button type="button" onClick={() => ir("recuperar")}
              className="-mr-2 min-h-11 rounded-lg px-2 font-medium text-marca-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-500">
              ¿Olvidó su contraseña?
            </button>
          </div>
        </fieldset>


        <Boton
          type="submit"
          disabled={ocupado}
          tamano="lg"
          aria-busy={estado === "enviando"}
          className={cx("w-full", ocupado && "cursor-progress !opacity-100", estado === "exito" && "!bg-[#047857]")}
        >
          {estado === "enviando" && <><Loader2 className="size-5 animate-spin" /> Verificando…</>}
          {estado === "exito" && <><CheckCircle2 className="size-5" /> Acceso correcto</>}
          {estado === "listo" && <><LogIn className="size-5" /> Ingresar</>}
        </Boton>
      </form>
    </div>
  );
}
