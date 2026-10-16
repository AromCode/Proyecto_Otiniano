"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Resultado } from "@/lib/tipos";
import { Aviso } from "./basicos";
import { Boton } from "./boton";
import type { Variante } from "./clases";

type Accion = (prev: Resultado | null, fd: FormData) => Promise<Resultado>;

/**
 * Envuelve un server action que devuelve Resultado: muestra el error, deshabilita el botón
 * mientras guarda y llama a onExito (o refresca) cuando sale bien.
 */
export function FormularioAccion({
  accion, children, textoBoton = "Guardar", variante = "primario", onExito, className, reiniciar = true,
}: {
  accion: Accion;
  children: React.ReactNode;
  textoBoton?: string;
  variante?: Variante;
  onExito?: (data: unknown) => void;
  className?: string;
  reiniciar?: boolean;
}) {
  const [estado, enviar, pendiente] = useActionState<Resultado | null, FormData>(accion, null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const exitoRef = useRef(onExito);
  exitoRef.current = onExito;

  useEffect(() => {
    if (estado?.ok) {
      if (reiniciar) formRef.current?.reset();
      if (exitoRef.current) exitoRef.current(estado.data);
      router.refresh();
    }
  }, [estado, reiniciar, router]);

  return (
    <form ref={formRef} action={enviar} className={className ?? "space-y-3"}>
      {children}
      {estado && !estado.ok && <Aviso tono="rojo">{estado.error}</Aviso>}
      <Boton type="submit" variante={variante} disabled={pendiente} className="w-full sm:w-auto">
        {pendiente ? "Guardando…" : textoBoton}
      </Boton>
    </form>
  );
}
