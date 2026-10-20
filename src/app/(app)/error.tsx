"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2, RotateCw, TriangleAlert } from "lucide-react";
import { Boton, BotonLink } from "@/components/ui/boton";

/** Si una pantalla falla al cargar (p. ej. se cortó la conexión), se ofrece reintentar sin perder la sesión */
export default function ErrorSeccion({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [reintentando, iniciar] = useTransition();

  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">No se pudo cargar esta pantalla</h1>
      <p className="mt-1 text-sm text-stone-500">
        Puede ser la conexión a internet. Sus datos están a salvo: nada se guarda a medias.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Boton onClick={() => iniciar(() => { router.refresh(); reset(); })} disabled={reintentando}>
          {reintentando ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />} Reintentar
        </Boton>
        <BotonLink href="/" variante="secundario"><Home className="size-4" /> Ir al inicio</BotonLink>
      </div>
      {error.digest && <p className="mt-6 text-xs text-stone-400">Código: {error.digest}</p>}
    </div>
  );
}
