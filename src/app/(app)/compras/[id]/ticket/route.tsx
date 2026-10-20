import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerContexto } from "@/lib/contexto";
import { cargarLogo } from "@/lib/archivos-servidor";
import { soles } from "@/lib/formato";
import { TicketPdf } from "@/lib/pdf/ticket";
import { ComprobantePdf, datosCompra } from "@/lib/pdf/comprobante";

export const runtime = "nodejs";

// Ticket de la compra: A4 con la marca de la empresa (por defecto) o ?formato=80mm para la impresora térmica.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const termico = new URL(request.url).searchParams.get("formato") === "80mm";
  const { supabase, empresa } = await obtenerContexto();
  const [{ data: c }, { data: items }, logo] = await Promise.all([
    supabase.from("v_compras").select("*").eq("id", id).single(),
    supabase.from("v_compra_items").select("*").eq("compra_id", id).order("id"),
    cargarLogo(supabase, empresa.logo_url),
  ]);
  if (!c) return new Response("No encontrada", { status: 404 });
  const filas = items ?? [];

  const pdf = await renderToBuffer(termico ? (
    <TicketPdf
      d={{
        titulo: "Compra",
        empresa,
        logo: logo?.buffer ?? null,
        numero: c.numero,
        fecha: c.fecha,
        contraparte: c.proveedor_nombre ?? "Sin documento",
        documento: c.proveedor_nro_doc ? `${c.proveedor_tipo_doc} ${c.proveedor_nro_doc}` : null,
        medio_pago: c.medio_pago,
        estado: c.estado,
        total: c.total,
        extras: Number(c.saldo_aplicado ?? 0) > 0
          ? [["A favor descontado", `- ${soles(c.saldo_aplicado)}`], ["Pagado", soles(Math.round(Number(c.total) * 100 - Number(c.saldo_aplicado) * 100) / 100)]]
          : [],
        notas: c.notas,
        items: filas.map((i) => ({
          metal: i.metal_nombre,
          bruto: i.peso_bruto_kg,
          descuento: i.descuento_kg,
          neto: i.peso_neto_kg,
          precio: i.precio_kg,
          importe: i.importe,
        })),
      }}
    />
  ) : (
    <ComprobantePdf d={datosCompra({ empresa, logo: logo?.buffer ?? null }, c, filas)} />
  ));

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="compra-${c.numero}${termico ? "-80mm" : ""}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
