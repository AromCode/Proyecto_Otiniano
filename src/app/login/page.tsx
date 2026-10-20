import type { Metadata } from "next";
import { BarChart3, CheckCircle2, Info, Scale, ShieldCheck, Wallet } from "lucide-react";
import { FormLogin } from "./form-login";
import { BotonDev } from "./boton-dev";
import { correosDev } from "@/lib/dev-login";

export const metadata: Metadata = { title: "Ingresar" };

const PUNTOS = [
  { icono: Scale, texto: "Compras pesadas al instante, con ticket para el proveedor." },
  { icono: Wallet, texto: "Caja y finanzas cuadradas al céntimo, día a día." },
  { icono: BarChart3, texto: "«¿Cuánto tenemos?» siempre a la vista: caja + mercadería." },
  { icono: ShieldCheck, texto: "Nada se borra: cada anulación queda con motivo y responsable." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; salio?: string; error?: string }> }) {
  const { next, salio, error } = await searchParams;
  const destino = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const devs = correosDev();

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panel de marca (solo escritorio) */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#b5602a] via-[#a85219] to-[#6e3514] p-10 text-white lg:flex lg:flex-col">
        <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-32 -left-16 size-96 rounded-full bg-black/10" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/95 shadow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="size-8" />
          </span>
          <span className="text-xl font-semibold tracking-tight">Otiniano</span>
        </div>
        <div className="relative my-auto max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Su negocio de metales, ordenado y al día.
          </h2>
          <p className="mt-3 text-white/80">Compra y venta · caja · inventario · resultados</p>
          <ul className="mt-8 space-y-4">
            {PUNTOS.map((p) => (
              <li key={p.texto} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <p.icono className="size-[18px]" />
                </span>
                <span className="pt-1.5 text-sm text-white/90">{p.texto}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} · Sistema Otiniano</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="animar-subir w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="size-14" />
            <p className="mt-2 text-xl font-semibold tracking-tight">Otiniano</p>
            <p className="text-sm text-stone-500">Compra y venta · caja · inventario</p>
          </div>

          <div className="mb-5">
            <h1 className="text-2xl font-semibold tracking-tight">Ingresar</h1>
            <p className="mt-1 text-sm text-stone-500">Use el correo y la contraseña que le dio el administrador.</p>
          </div>

          {salio && (
            <div role="status" className="animar-entrada mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span><b className="font-semibold">Sesión cerrada correctamente.</b> ¡Hasta pronto!</span>
            </div>
          )}
          {!salio && !error && destino !== "/" && (
            <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>Su sesión terminó o aún no ha ingresado. Ingrese para continuar donde estaba.</span>
            </div>
          )}

          <div className="rounded-2xl border border-stone-200 bg-superficie p-5 shadow-sm sm:p-6">
            <FormLogin next={destino} errorInicial={error === "1"} />
          </div>

          {/* Acceso directo: solo existe con `pnpm dev` y DEV_LOGIN_EMAIL en .env.local */}
          {devs.length > 0 && (
            <div className="mt-4 space-y-2">
              {devs.map((email, i) => <BotonDev key={email} email={email} principal={i === 0} />)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
