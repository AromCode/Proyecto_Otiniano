import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerContexto } from "@/lib/contexto";
import { TicketPdf } from "@/lib/pdf/ticket";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, empresa } = await obtenerContexto();
  const [{ data: v }, { data: items }] = await Promise.all([
    supabase.from("v_ventas").select("*").eq("id", id).single(),
    supabase.from("v_venta_items").select("*").eq("venta_id", id),
  ]);
  if (!v) return new Response("No encontrada", { status: 404 });

  const pdf = await renderToBuffer(
    <TicketPdf
      d={{
        titulo: v.estado === "pendiente" ? "Nota de salida" : "Venta",
        empresa,
        numero: v.numero,
        fecha: v.fecha,
        contraparte: v.comprador_nombre,
        documento: v.comprador_ruc ? `RUC ${v.comprador_ruc}` : null,
        medio_pago: v.medio_pago,
        estado: v.estado,
        total: v.total,
        notas: [v.guia_numero && `Guía ${v.guia_numero}`, v.notas].filter(Boolean).join(" · ") || null,
        pie: "Pesos de salida según nuestra balanza",
        items: (items ?? []).map((i) => ({
          metal: i.metal_nombre,
          neto: i.peso_recibido_kg ?? i.peso_salida_kg,
          precio: i.precio_kg,
          importe: i.importe,
        })),
      }}
    />,
  );
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="venta-${v.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
