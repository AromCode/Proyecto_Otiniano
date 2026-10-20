import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { logoDataUri } from "@/lib/ticket-datos";
import type { ResumenTurno } from "@/lib/tipos";
import { Cierre80 } from "@/components/ticket/cierre-80";

export const metadata: Metadata = { title: "Cierre de caja" };

// Fuera de (app): solo el ticket. Lo abre BotonImprimir80 en un iframe oculto.
export default async function ImprimirCierre({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obtenerContexto();
  const [{ data, error }, logo] = await Promise.all([
    ctx.supabase.rpc("resumen_turno", { p_turno: id }),
    logoDataUri(ctx),
  ]);
  if (error || !data) notFound();
  return <Cierre80 r={data as unknown as ResumenTurno} empresa={ctx.empresa} logo={logo} />;
}
