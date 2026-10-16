import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerContexto } from "@/lib/contexto";
import { TicketPdf } from "@/lib/pdf/ticket";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, empresa } = await obtenerContexto();
  const [{ data: c }, { data: items }] = await Promise.all([
    supabase.from("v_compras").select("*").eq("id", id).single(),
    supabase.from("v_compra_items").select("*").eq("compra_id", id),
  ]);
  if (!c) return new Response("No encontrada", { status: 404 });

  const pdf = await renderToBuffer(
    <TicketPdf
      d={{
        titulo: "Compra",
        empresa,
        numero: c.numero,
        fecha: c.fecha,
        contraparte: c.proveedor_nombre ?? "Sin documento",
        documento: c.proveedor_nro_doc ? `${c.proveedor_tipo_doc} ${c.proveedor_nro_doc}` : null,
        medio_pago: c.medio_pago,
        estado: c.estado,
        total: c.total,
        notas: c.notas,
        items: (items ?? []).map((i) => ({
          metal: i.metal_nombre,
          bruto: i.peso_bruto_kg,
          descuento: i.descuento_kg,
          neto: i.peso_neto_kg,
          precio: i.precio_kg,
          importe: i.importe,
        })),
      }}
    />,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="compra-${c.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
