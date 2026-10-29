import type { Metadata } from "next";
import { obtenerContexto } from "@/lib/contexto";
import { ETIQUETA_ROL } from "@/lib/formato";
import { PantallaBienvenida } from "./pantalla-bienvenida";
import { destinoSeguro } from "@/lib/destino";

export const metadata: Metadata = { title: "Bienvenido" };

function saludo() {
  const hora = Number(new Intl.DateTimeFormat("es-PE", { hour: "numeric", hourCycle: "h23", timeZone: "America/Lima" }).format(new Date()));
  return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

/** Paso entre el login y el sistema: confirma el ingreso y precarga la pantalla de destino */
export default async function Bienvenida({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ nombre, empresa, rol }, { next }] = await Promise.all([obtenerContexto(), searchParams]);
  const pedido = destinoSeguro(next);
  const destino = pedido.startsWith("/bienvenida") ? "/" : pedido;
  return (
    <PantallaBienvenida
      saludo={saludo()}
      nombre={nombre}
      empresa={empresa.razon_social}
      rol={ETIQUETA_ROL[rol]}
      destino={destino}
    />
  );
}
