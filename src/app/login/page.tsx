import type { Metadata } from "next";
import { FormLogin } from "./form-login";
import { correosDev } from "@/lib/dev-login";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-14" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Metales</h1>
          <p className="text-sm text-stone-500">Compra y venta · caja · inventario</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-superficie p-5 shadow-sm">
          <FormLogin next={next && next.startsWith("/") ? next : "/"} />
        </div>
        {/* Acceso directo: solo existe con `pnpm dev` y DEV_LOGIN_EMAIL en .env.local */}
        {correosDev().map((email, i) => (
          <form key={email} action="/auth/dev" method="post" className={i === 0 ? "mt-3" : "mt-2"}>
            <input type="hidden" name="email" value={email} />
            <button className={i === 0
              ? "w-full rounded-xl border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100"
              : "w-full rounded-xl border border-dashed border-stone-300 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100"}>
              Entrar directo como {email}
              {i === 0 && <span className="block text-xs font-normal text-amber-700">Solo en desarrollo</span>}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
