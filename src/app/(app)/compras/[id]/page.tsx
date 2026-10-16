import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, ImageIcon } from "lucide-react";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { urlArchivo } from "@/lib/archivos-servidor";
import { ETIQUETA_MEDIO, fechaHora, kg, soles } from "@/lib/formato";
import { Aviso, Dato, Encabezado, Insignia, PuntoMetal, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { BotonAnular } from "@/components/boton-anular";
import { anularCompra } from "../acciones";

export const metadata: Metadata = { title: "Detalle de compra" };

export default async function CompraDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, rol } = await obtenerContexto();
  const [{ data: c }, { data: items }] = await Promise.all([
    supabase.from("v_compras").select("*").eq("id", id).maybeSingle(),
    supabase.from("v_compra_items").select("*").eq("compra_id", id),
  ]);
  if (!c) notFound();

  const [foto, usuarios] = await Promise.all([
    urlArchivo(supabase, c.foto_ticket_url),
    supabase.from("miembros").select("user_id, nombre, email").eq("empresa_id", c.empresa_id),
  ]);
  const nombreDe = (uid: string | null) =>
    usuarios.data?.find((u) => u.user_id === uid)?.nombre ?? usuarios.data?.find((u) => u.user_id === uid)?.email ?? "—";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/compras" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Compras
      </Link>
      <Encabezado
        titulo={`Compra N° ${c.numero}`}
        descripcion={fechaHora(c.fecha)}
        acciones={
          <>
            <a href={`/compras/${c.id}/ticket`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50">
              <FileText className="size-4" /> Ticket
            </a>
            {puede(rol, "anular") && c.estado === "registrada" && (
              <BotonAnular
                id={c.id}
                accion={anularCompra}
                titulo={`Anular compra N° ${c.numero}`}
                explicacion="Se devolverá el dinero a la caja y se descontarán los kilos del stock."
              />
            )}
          </>
        }
      />

      {c.estado === "anulada" && (
        <div className="mb-4">
          <Aviso tono="rojo">
            Anulada el {fechaHora(c.anulado_en)} por {nombreDe(c.anulado_por)}. Motivo: {c.motivo_anulacion}
          </Aviso>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta className="lg:col-span-2">
          <TituloTarjeta>Metales</TituloTarjeta>
          <TablaDatos
            filas={items ?? []}
            clave={(i) => i.id}
            columnas={[
              { titulo: "Metal", principal: true, celda: (i) => <span className="flex items-center gap-2"><PuntoMetal color={i.metal_color} />{i.metal_nombre}</span> },
              { titulo: "Bruto", alinear: "der", celda: (i) => <span className="cifra">{kg(i.peso_bruto_kg)}</span> },
              { titulo: "Descuento", alinear: "der", celda: (i) => <span className="cifra">{kg(i.descuento_kg)}</span> },
              { titulo: "Neto", alinear: "der", celda: (i) => <span className="cifra font-medium">{kg(i.peso_neto_kg)}</span> },
              { titulo: "Precio/kg", alinear: "der", celda: (i) => <span className="cifra">{soles(i.precio_kg)}</span> },
              { titulo: "Importe", alinear: "der", principal: true, celda: (i) => <span className="cifra font-semibold">{soles(i.importe)}</span> },
            ]}
            pie={
              <tr>
                <td className="px-4 py-2.5" colSpan={3}>Total</td>
                <td className="cifra px-4 py-2.5 text-right">{kg(c.kg_total)}</td>
                <td />
                <td className="cifra px-4 py-2.5 text-right">{soles(c.total)}</td>
              </tr>
            }
          />
          <div className="flex justify-between border-t border-stone-100 px-4 py-3 font-semibold md:hidden">
            <span>Total</span>
            <span className="cifra">{soles(c.total)}</span>
          </div>
        </Tarjeta>

        <div className="space-y-4">
          <Tarjeta className="p-4">
            <dl className="grid grid-cols-2 gap-3">
              <Dato etiqueta="Proveedor">
                {c.proveedor_id ? <Link className="text-marca-700 hover:underline" href={`/proveedores/${c.proveedor_id}`}>{c.proveedor_nombre}</Link> : "Sin documento"}
              </Dato>
              <Dato etiqueta="Documento">{c.proveedor_nro_doc ? `${c.proveedor_tipo_doc} ${c.proveedor_nro_doc}` : "—"}</Dato>
              <Dato etiqueta="Medio de pago">{ETIQUETA_MEDIO[c.medio_pago]}</Dato>
              <Dato etiqueta="Caja">{c.caja_nombre}</Dato>
              <Dato etiqueta="Estado">
                {c.estado === "anulada" ? <Insignia tono="rojo">Anulada</Insignia> : <Insignia tono="verde">Registrada</Insignia>}
              </Dato>
              <Dato etiqueta="Registró">{nombreDe(c.creado_por)}</Dato>
            </dl>
            {c.notas && <p className="mt-3 rounded-lg bg-stone-50 p-2 text-sm text-stone-700">{c.notas}</p>}
          </Tarjeta>
          <Tarjeta className="p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium"><ImageIcon className="size-4" /> Ticket de balanza</p>
            {foto ? (
              <a href={foto} target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto} alt="Ticket de balanza" className="max-h-80 w-full rounded-lg object-contain" />
              </a>
            ) : <p className="text-sm text-stone-500">Sin foto.</p>}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
