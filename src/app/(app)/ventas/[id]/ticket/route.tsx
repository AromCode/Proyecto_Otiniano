import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerContexto } from "@/lib/contexto";
import { cargarLogo } from "@/lib/archivos-servidor";
import { TicketPdf } from "@/lib/pdf/ticket";
import { ComprobantePdf, datosVenta } from "@/lib/pdf/comprobante";

export const runtime = "nodejs";

// Nota de salida / comprobante de la venta: A4 con la marca (por defecto) o ?formato=80mm para la impresora térmica.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const termico = new URL(request.url).searchParams.get("formato") === "80mm";
  const { supabase, empresa } = await obtenerContexto();
  const [{ data: v }, { data: items }, logo] = await Promise.all([
    supabase.from("v_ventas").select("*").eq("id", id).single(),
    supabase.from("v_venta_items").select("*").eq("venta_id", id).order("id"),
    cargarLogo(supabase, empresa.logo_url),
  ]);
  if (!v) return new Response("No encontrada", { status: 404 });
  const filas = items ?? [];

  const pdf = await renderToBuffer(termico ? (
    <TicketPdf
      d={{
        titulo: v.estado === "pendiente" ? "Nota de salida" : "Venta",
        empresa,
        logo: logo?.buffer ?? null,
        numero: v.numero,
        fecha: v.fecha,
        contraparte: v.comprador_nombre,
        documento: v.comprador_ruc ? `RUC ${v.comprador_ruc}` : null,
        medio_pago: v.medio_pago,
        estado: v.estado,
        total: v.total,
        notas: [v.guia_numero && `Guía ${v.guia_numero}`, v.notas].filter(Boolean).join(" · ") || null,
        pie: "Pesos de salida según nuestra balanza",
        items: filas.map((i) => ({
          metal: i.metal_nombre,
          neto: i.peso_recibido_kg ?? i.peso_salida_kg,
          precio: i.precio_kg,
          importe: i.importe,
        })),
      }}
    />
  ) : (
    <ComprobantePdf d={datosVenta({ empresa, logo: logo?.buffer ?? null }, v, filas)} />
  ));

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="venta-${v.numero}${termico ? "-80mm" : ""}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
