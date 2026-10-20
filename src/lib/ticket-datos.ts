import "server-only";
import type { Contexto } from "./contexto";
import { cargarLogo } from "./archivos-servidor";
import { soles } from "./formato";
import type { DatosTicket } from "./pdf/ticket";

// Datos del ticket de 80 mm: los usan el PDF (ticket/route.tsx) y la página de impresión directa (/imprimir).

export async function logoDataUri(ctx: Contexto) {
  const logo = await cargarLogo(ctx.supabase, ctx.empresa.logo_url);
  return logo ? `data:image/${logo.ext};base64,${logo.buffer.toString("base64")}` : null;
}

export async function ticketCompra(ctx: Contexto, id: string): Promise<DatosTicket | null> {
  const { supabase, empresa } = ctx;
  const [{ data: c }, { data: items }, logo] = await Promise.all([
    supabase.from("v_compras").select("*").eq("id", id).single(),
    supabase.from("v_compra_items").select("*").eq("compra_id", id).order("id"),
    logoDataUri(ctx),
  ]);
  if (!c) return null;
  return {
    titulo: "Compra",
    empresa,
    logo,
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
    items: (items ?? []).map((i) => ({
      metal: i.metal_nombre,
      bruto: i.peso_bruto_kg,
      descuento: i.descuento_kg,
      neto: i.peso_neto_kg,
      precio: i.precio_kg,
      importe: i.importe,
    })),
  };
}

export async function ticketVenta(ctx: Contexto, id: string): Promise<DatosTicket | null> {
  const { supabase, empresa } = ctx;
  const [{ data: v }, { data: items }, logo] = await Promise.all([
    supabase.from("v_ventas").select("*").eq("id", id).single(),
    supabase.from("v_venta_items").select("*").eq("venta_id", id).order("id"),
    logoDataUri(ctx),
  ]);
  if (!v) return null;
  return {
    titulo: v.estado === "pendiente" ? "Nota de salida" : "Venta",
    empresa,
    logo,
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
  };
}
