import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fecha, fechaHora, kg, soles } from "@/lib/formato";
import { Dato, Encabezado, Insignia, Kpi, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import type { Comprador } from "@/lib/tipos";
import { EditarComprador } from "../form-comprador";

export const metadata: Metadata = { title: "Comprador" };

export default async function CompradorDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, rol } = await exigir("verTodo", "vender");
  const [{ data: c }, { data: ventas }] = await Promise.all([
    supabase.from("v_compradores_resumen").select("*").eq("id", id).maybeSingle(),
    supabase.from("v_ventas").select("*").eq("comprador_id", id).order("fecha", { ascending: false }).limit(100),
  ]);
  if (!c) notFound();

  return (
    <>
      <Link href="/compradores" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Compradores
      </Link>
      <Encabezado
        titulo={c.razon_social}
        descripcion={c.ruc ? `RUC ${c.ruc}` : "Sin RUC"}
        acciones={puede(rol, "editarTerceros") && <EditarComprador comprador={c as Comprador} />}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Ventas confirmadas" valor={c.n_ventas} />
        <Kpi titulo="Kilos recibidos" valor={kg(c.kg_total)} />
        <Kpi titulo="Total cobrado" valor={soles(c.importe_total)} />
        <Kpi titulo="Última venta" valor={fecha(c.ultima_venta)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta className="lg:col-span-2">
          <TituloTarjeta>Historial de ventas</TituloTarjeta>
          <TablaDatos
            filas={ventas ?? []}
            clave={(v) => v.id}
            enlace={(v) => `/ventas/${v.id}`}
            vacio="Aún no hay ventas."
            columnas={[
              { titulo: "N°", principal: true, celda: (v) => `#${v.numero}` },
              { titulo: "Fecha", celda: (v) => fechaHora(v.fecha) },
              { titulo: "Metales", celda: (v) => v.metales },
              { titulo: "Salida", alinear: "der", celda: (v) => <span className="cifra">{kg(v.kg_salida)}</span> },
              { titulo: "Merma", alinear: "der", celda: (v) => v.merma_kg === null ? "—" : <span className="cifra">{kg(v.merma_kg)}</span> },
              { titulo: "Total", alinear: "der", principal: true, celda: (v) => <span className={v.estado === "anulada" ? "cifra text-stone-400 line-through" : "cifra"}>{soles(v.total)}</span> },
              { titulo: "Estado", celda: (v) => <Insignia tono={v.estado === "confirmada" ? "verde" : v.estado === "anulada" ? "rojo" : "ambar"}>{v.estado}</Insignia> },
            ]}
          />
        </Tarjeta>
        <Tarjeta className="p-4">
          <dl className="grid grid-cols-2 gap-3">
            <Dato etiqueta="Dirección">{c.direccion ?? "—"}</Dato>
            <Dato etiqueta="Teléfono">{c.telefono ?? "—"}</Dato>
            <Dato etiqueta="Contacto">{c.contacto ?? "—"}</Dato>
            <Dato etiqueta="Estado">{c.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</Dato>
          </dl>
        </Tarjeta>
      </div>
    </>
  );
}
