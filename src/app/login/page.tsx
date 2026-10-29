import type { Metadata } from "next";
import { EscenaMarca } from "@/components/marca/escena-marca";
import { FormLogin } from "./form-login";
import { AvisosLogin } from "./avisos-login";
import { IngresoPorRol } from "./boton-dev";
import { headers } from "next/headers";
import { esHostLocal, usuariosDev } from "@/lib/dev-login";
import { destinoSeguro } from "@/lib/destino";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; salio?: string; error?: string; enlace?: string }>;
}) {
  const { next, salio, error, enlace } = await searchParams;
  const destino = destinoSeguro(next);
  // Ingreso directo por rol: solo con `pnpm dev` y abriendo en esta máquina (en producción no existe)
  const devs = esHostLocal((await headers()).get("host")) ? await usuariosDev().catch(() => ({})) : {};

  return (
    <EscenaMarca>
      <AvisosLogin salio={!!salio} enlaceVencido={enlace === "vencido"} sesionTermino={!error && destino !== "/"} />

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-superficie text-stone-900 shadow-2xl shadow-black/50">
        {/* Filo de color del logo */}
        <div aria-hidden className="h-1 bg-gradient-to-r from-[#22c0f8] via-[#1f86d9] to-[#1a5ca8]" />
        <div className="p-5 sm:p-7">
          <FormLogin
            next={destino}
            errorInicial={error === "1"}
            ingresoDirecto={Object.keys(devs).length > 0 ? <IngresoPorRol usuarios={devs} /> : null}
          />
        </div>
      </div>
    </EscenaMarca>
  );
}
