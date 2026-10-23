import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { BotonImprimir80 } from "@/components/ticket/boton-imprimir-80";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { urlArchivo } from "@/lib/archivos-servidor";
import { fechaHora, kg, soles } from "@/lib/formato";
import { cargarMediosPago } from "@/lib/productos";
import { Aviso, Dato, Encabezado, Insignia, PuntoMetal, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { BotonAnular } from "@/components/boton-anular";
import type { Caja } from "@/lib/tipos";
import { anularVenta } from "../acciones";
import { ConfirmarVenta } from "./confirmar-venta";
import { EditarGuia } from "./editar-guia";

export const metadata: Metadata = { title: "Detalle de venta" };

export default async function VentaDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await exigir("verTodo", "vender");
  const { supabase, rol, empresa } = ctx;
  const [{ data: v }, { data: items }, { data: cajas }, medios] = await Promise.all([
    supabase.from("v_ventas").select("*").eq("id", id).maybeSingle(),
    supabase.from("v_venta_items").select("*").eq("venta_id", id),
    supabase.from("cajas").select("*").eq("empresa_id", empresa.id).eq("activo", true).order("orden"),
    cargarMediosPago(ctx),
  ]);
  if (!v) notFound();
  const [guia, comprobante] = await Promise.all([urlArchivo(supabase, v.guia_url), urlArchivo(supabase, v.comprobante_url)]);
  const pendiente = v.estado === "pendiente";

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/ventas" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Ventas
      </Link>
      <Encabezado
        titulo={`Venta N° ${v.numero}`}
        descripcion={`Salida ${fechaHora(v.fecha)}${v.fecha_confirmacion ? ` · Confirmada ${fechaHora(v.fecha_confirmacion)}` : ""}`}
        acciones={
          <>
            <a href={`/ventas/${v.id}/ticket`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-superficie px-4 text-sm font-medium hover:bg-stone-50">
              <FileText className="size-4" /> {v.estado === "pendiente" ? "Nota de salida" : "Nota de venta PDF"}
            </a>
            <BotonImprimir80 href={`/imprimir/venta/${v.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-superficie px-4 text-sm font-medium hover:bg-stone-50" />
            {puede(rol, "anular") && v.estado !== "anulada" && (
              <BotonAnular id={v.id} accion={anularVenta} titulo={`Anular venta N° ${v.numero}`}
                explicacion="Los kilos vuelven al stock con su costo y, si estaba cobrada, se revierte el ingreso de caja." />
            )}
          </>
        }
      />

      {v.estado === "anulada" && <div className="mb-4"><Aviso tono="rojo">Anulada el {fechaHora(v.anulado_en)}. Motivo: {v.motivo_anulacion}</Aviso></div>}

      {pendiente && puede(rol, "vender") && (
        <div className="mb-4">
          <ConfirmarVenta
            ventaId={v.id}
            empresaId={empresa.id}
            items={(items ?? []).map((i) => ({ id: i.id, metal: i.metal_nombre, color: i.metal_color, salida: i.peso_salida_kg }))}
            cajas={(cajas ?? []) as Caja[]}
            medios={medios}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Tarjeta className="min-w-0">
          <TituloTarjeta>Productos</TituloTarjeta>
          <TablaDatos
            filas={items ?? []}
            clave={(i) => i.id}
            columnas={[
              { titulo: "Producto", principal: true, celda: (i) => <Link href={`/inventario/${i.metal_id}`} className="flex items-center gap-2 hover:underline"><PuntoMetal color={i.metal_color} />{i.metal_nombre}</Link> },
              { titulo: "Salida", alinear: "der", celda: (i) => <span className="cifra">{kg(i.peso_salida_kg)}</span> },
              { titulo: "Recibido", alinear: "der", celda: (i) => i.peso_recibido_kg === null ? "—" : <span className="cifra">{kg(i.peso_recibido_kg)}</span> },
              { titulo: "Merma", alinear: "der", celda: (i) => i.merma_kg === null ? "—" : <span className="cifra text-amber-700">{kg(i.merma_kg)}</span> },
              { titulo: "Precio/kg", alinear: "der", celda: (i) => i.precio_kg === null ? "—" : <span className="cifra">{soles(i.precio_kg)}</span> },
              { titulo: "Importe", alinear: "der", principal: true, celda: (i) => i.importe === null ? "—" : <span className="cifra font-semibold">{soles(i.importe)}</span> },
            ]}
          />
        </Tarjeta>

        <div className="space-y-4">
          <Tarjeta className="p-4">
            <dl className="grid grid-cols-2 gap-3">
              <Dato etiqueta="Comprador"><Link className="text-marca-700 hover:underline" href={`/compradores/${v.comprador_id}`}>{v.comprador_nombre}</Link></Dato>
              <Dato etiqueta="RUC">{v.comprador_ruc ?? "—"}</Dato>
              <Dato etiqueta="Estado">
                <Insignia tono={v.estado === "confirmada" ? "verde" : v.estado === "anulada" ? "rojo" : "ambar"}>
                  {v.estado === "pendiente" ? "Pendiente de pesaje" : v.estado === "confirmada" ? "Confirmada" : "Anulada"}
                </Insignia>
              </Dato>
              <Dato etiqueta="Total cobrado">{soles(v.total)}</Dato>
              {v.medio_nombre && <Dato etiqueta="Medio">{v.medio_nombre}</Dato>}
              {v.caja_nombre && <Dato etiqueta="Caja">{v.caja_nombre}</Dato>}
            </dl>
          </Tarjeta>
          {puede(rol, "verTodo") && (
            <Tarjeta className="p-4">
              <p className="mb-2 text-sm font-medium">Costo y merma</p>
              <dl className="grid grid-cols-2 gap-3">
                <Dato etiqueta="Costo de lo que salió">{soles(v.costo_total)}</Dato>
                <Dato etiqueta="Costo de lo vendido">{v.costo_vendido === null ? "—" : soles(v.costo_vendido)}</Dato>
                <Dato etiqueta="Merma valorizada">{v.merma_costo === null ? "—" : soles(v.merma_costo)}</Dato>
                <Dato etiqueta="Margen">{v.estado === "confirmada" ? soles(Number(v.total) - Number(v.costo_total)) : "—"}</Dato>
              </dl>
            </Tarjeta>
          )}
          <Tarjeta className="p-4">
            <EditarGuia
              ventaId={v.id}
              empresaId={empresa.id}
              puedeEditar={puede(rol, "vender") && v.estado !== "anulada"}
              guiaNumero={v.guia_numero}
              guiaRuta={v.guia_url}
              guiaUrl={guia}
              comprobanteRuta={v.comprobante_url}
              comprobanteUrl={comprobante}
              notas={v.notas}
            />
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
