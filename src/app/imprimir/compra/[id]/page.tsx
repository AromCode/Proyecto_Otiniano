import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { ticketCompra } from "@/lib/ticket-datos";
import { Ticket80 } from "@/components/ticket/ticket-80";

export const metadata: Metadata = { title: "Ticket de compra" };

// Fuera de (app): sin menú ni barra, solo el ticket. Lo abre BotonImprimir80 en un iframe oculto.
export default async function ImprimirCompra({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await ticketCompra(await obtenerContexto(), id);
  if (!d) notFound();
  return <Ticket80 d={d} />;
}
