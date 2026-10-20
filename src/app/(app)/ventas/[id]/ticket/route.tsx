import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerContexto } from "@/lib/contexto";
import { cargarLogo } from "@/lib/archivos-servidor";
import { TicketPdf } from "@/lib/pdf/ticket";
import { ComprobantePdf, datosVenta } from "@/lib/pdf/comprobante";
import { ticketVenta } from "@/lib/ticket-datos";

export const runtime = "nodejs";

const pdfResponse = (pdf: Buffer, nombre: string) =>
  new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nombre}.pdf"`, "Cache-Control": "private, no-store" },
  });

// Nota de salida / comprobante de la venta: A4 con la marca (por defecto) o ?formato=80mm en PDF.
// Para imprimir en la térmica se usa /imprimir/venta/[id] (HTML del alto justo del contenido).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obtenerContexto();

  if (new URL(request.url).searchParams.get("formato") === "80mm") {
    const d = await ticketVenta(ctx, id);
    if (!d) return new Response("No encontrada", { status: 404 });
    return pdfResponse(await renderToBuffer(<TicketPdf d={d} />), `venta-${d.numero}-80mm`);
  }

  const { supabase, empresa } = ctx;
  const [{ data: v }, { data: items }, logo] = await Promise.all([
    supabase.from("v_ventas").select("*").eq("id", id).single(),
    supabase.from("v_venta_items").select("*").eq("venta_id", id).order("id"),
    cargarLogo(supabase, empresa.logo_url),
  ]);
  if (!v) return new Response("No encontrada", { status: 404 });
  const pdf = await renderToBuffer(<ComprobantePdf d={datosVenta({ empresa, logo: logo?.buffer ?? null }, v, items ?? [])} />);
  return pdfResponse(pdf, `venta-${v.numero}`);
}
