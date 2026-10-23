import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fecha, fechaHora, kg, soles } from "@/lib/formato";
import { Dato, Encabezado, Insignia, Kpi, PuntoMetal, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { Pestanas } from "@/components/ui/pestanas";
import { TablaDatos } from "@/components/ui/tabla";
import type { Comprador } from "@/lib/tipos";
import { EditarComprador } from "../form-comprador";

type PorMetal = {
  metal_id: string; metal: string; color: string | null; kg: number; importe: number; precio_promedio: number | null;
  n_compras?: number; n_ventas?: number; merma_kg?: number;
};

export const metadata: Metadata = { title: "Cliente" };

export default async function CompradorDetalle({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const pestana = tab === "ventas" || tab === "metales" ? tab : "resumen";
  const { supabase, rol } = await exigir("verTodo", "vender");
  const [{ data: c }, { data: ventas }, { data: metales }] = await Promise.all([
    supabase.from("v_compradores_resumen").select("*").eq("id", id).maybeSingle(),
    supabase.from("v_ventas").select("*").eq("comprador_id", id).order("fecha", { ascending: false }).limit(100),
    supabase.rpc("comprador_por_metal", { p_comprador: id }),
  ]);
  if (!c) notFound();
  const porMetal = (metales ?? []) as PorMetal[];
  const maxImporte = Math.max(...porMetal.map((m) => Number(m.importe)), 1);
  const pendientes = (ventas ?? []).filter((v) => v.estado === "pendiente").length;

  const historial = (
    <Tarjeta>
      <TituloTarjeta>Historial de ventas</TituloTarjeta>
      <TablaDatos
        filas={ventas ?? []}
        clave={(v) => v.id}
        enlace={(v) => `/ventas/${v.id}`}
        vacio="Aún no hay ventas."
        columnas={[
          { titulo: "N°", principal: true, celda: (v) => `#${v.numero}` },
          { titulo: "Fecha", celda: (v) => fechaHora(v.fecha) },
          { titulo: "Productos", celda: (v) => v.metales },
          { titulo: "Salida", alinear: "der", celda: (v) => <span className="cifra">{kg(v.kg_salida)}</span> },
          { titulo: "Merma", alinear: "der", celda: (v) => v.merma_kg === null ? "—" : <span className="cifra">{kg(v.merma_kg)}</span> },
          { titulo: "Total", alinear: "der", principal: true, celda: (v) => <span className={v.estado === "anulada" ? "cifra text-stone-400 line-through" : "cifra"}>{soles(v.total)}</span> },
          { titulo: "Estado", celda: (v) => <Insignia tono={v.estado === "confirmada" ? "verde" : v.estado === "anulada" ? "rojo" : "ambar"}>{v.estado}</Insignia> },
        ]}
      />
    </Tarjeta>
  );

  const tablaMetales = (
    <Tarjeta>
      <TituloTarjeta>Lo que le vendemos, por producto</TituloTarjeta>
      <ul className="divide-y divide-stone-100">
        {porMetal.map((m) => (
          <li key={m.metal_id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium"><PuntoMetal color={m.color} /> {m.metal}</span>
              <span className="cifra font-semibold">{soles(m.importe)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full" style={{ width: `${(Number(m.importe) / maxImporte) * 100}%`, background: m.color ?? "#a8a29e" }} />
            </div>
            <p className="mt-1 text-xs tabular-nums text-stone-500">
              {kg(m.kg)} recibidos · merma {kg(m.merma_kg)} · promedio {soles(m.precio_promedio)}/kg
            </p>
          </li>
        ))}
        {porMetal.length === 0 && <li className="px-4 py-6 text-center text-sm text-stone-500">Aún no hay ventas confirmadas.</li>}
      </ul>
    </Tarjeta>
  );

  return (
    <>
      <Link href="/compradores" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Clientes
      </Link>
      <Encabezado
        titulo={c.razon_social}
        descripcion={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{c.ruc ? `RUC ${c.ruc}` : "Sin RUC"}</span>
            {c.telefono && (
              <a href={`tel:${c.telefono}`} className="inline-flex items-center gap-1 text-marca-700 hover:underline">
                <Phone className="size-3.5" /> {c.telefono}
              </a>
            )}
            {!c.activo && <Insignia>Inactivo</Insignia>}
          </span>
        }
        acciones={puede(rol, "editarTerceros") && <EditarComprador comprador={c as Comprador} />}
      />

      <Pestanas
        base={`/compradores/${id}`}
        actual={pestana}
        opciones={[
          { valor: "resumen", texto: "Resumen" },
          { valor: "ventas", texto: "Ventas", cantidad: (ventas ?? []).length },
          { valor: "metales", texto: "Por producto", cantidad: porMetal.length },
        ]}
      />

      {pestana === "resumen" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Ventas confirmadas" valor={c.n_ventas} detalle={pendientes > 0 ? `${pendientes} pendiente(s) de pesaje` : undefined} />
            <Kpi titulo="Kilos recibidos" valor={kg(c.kg_total)} />
            <Kpi titulo="Total cobrado" valor={soles(c.importe_total)} />
            <Kpi titulo="Última venta" valor={fecha(c.ultima_venta)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta className="p-4">
              <dl className="grid grid-cols-2 gap-3">
                <Dato etiqueta="RUC">{c.ruc ?? "—"}</Dato>
                <Dato etiqueta="Contacto">{c.contacto ?? "—"}</Dato>
                <Dato etiqueta="Teléfono">{c.telefono ?? "—"}</Dato>
                <Dato etiqueta="Dirección">{c.direccion ?? "—"}</Dato>
                <Dato etiqueta="Estado">{c.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</Dato>
              </dl>
            </Tarjeta>
            {tablaMetales}
          </div>
        </>
      )}
      {pestana === "ventas" && historial}
      {pestana === "metales" && tablaMetales}
    </>
  );
}
