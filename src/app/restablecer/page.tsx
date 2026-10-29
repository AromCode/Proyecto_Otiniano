import type { Metadata } from "next";
import { EscenaMarca } from "@/components/marca/escena-marca";
import { crearClienteServidor } from "@/lib/supabase/server";
import { FormRestablecer } from "./form-restablecer";

export const metadata: Metadata = { title: "Nueva contraseña" };

// Se llega desde el enlace del correo (/auth/confirmar ya abrió la sesión). Sin sesión, el middleware manda al login.
export default async function Restablecer() {
  const { data } = await (await crearClienteServidor()).auth.getUser();
  return (
    <EscenaMarca>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-superficie text-stone-900 shadow-2xl shadow-black/50">
        <div aria-hidden className="h-1 bg-gradient-to-r from-[#22c0f8] via-[#1f86d9] to-[#1a5ca8]" />
        <div className="p-5 sm:p-7">
          <FormRestablecer correo={data.user?.email ?? ""} />
        </div>
      </div>
    </EscenaMarca>
  );
}
