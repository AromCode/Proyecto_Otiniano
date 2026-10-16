import type { Metadata } from "next";
import { FormLogin } from "./form-login";

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
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <FormLogin next={next && next.startsWith("/") ? next : "/"} />
        </div>
      </div>
    </main>
  );
}
