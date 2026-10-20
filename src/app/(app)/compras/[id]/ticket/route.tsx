import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerContexto } from "@/lib/contexto";
import { cargarLogo } from "@/lib/archivos-servidor";
import { TicketPdf } from "@/lib/pdf/ticket";
import { ComprobantePdf, datosCompra } from "@/lib/pdf/comprobante";
import { ticketCompra } from "@/lib/ticket-datos";

export const runtime = "nodejs";

const pdfResponse = (pdf: Buffer, nombre: string) =>
  new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nombre}.pdf"`, "Cache-Control": "private, no-store" },
  });

// Ticket de la compra: A4 con la marca de la empresa (por defecto) o ?formato=80mm en PDF.
// Para imprimir en la térmica se usa /imprimir/compra/[id] (HTML del alto justo del contenido).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obtenerContexto();

  if (new URL(request.url).searchParams.get("formato") === "80mm") {
    const d = await ticketCompra(ctx, id);
    if (!d) return new Response("No encontrada", { status: 404 });
    return pdfResponse(await renderToBuffer(<TicketPdf d={d} />), `compra-${d.numero}-80mm`);
  }

  const { supabase, empresa } = ctx;
  const [{ data: c }, { data: items }, logo] = await Promise.all([
    supabase.from("v_compras").select("*").eq("id", id).single(),
    supabase.from("v_compra_items").select("*").eq("compra_id", id).order("id"),
    cargarLogo(supabase, empresa.logo_url),
  ]);
  if (!c) return new Response("No encontrada", { status: 404 });
  const pdf = await renderToBuffer(<ComprobantePdf d={datosCompra({ empresa, logo: logo?.buffer ?? null }, c, items ?? [])} />);
  return pdfResponse(pdf, `compra-${c.numero}`);
}
