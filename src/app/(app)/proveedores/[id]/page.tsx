import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fecha, fechaHora, kg, soles } from "@/lib/formato";
import { Dato, Encabezado, Insignia, Kpi, PuntoMetal, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { Pestanas } from "@/components/ui/pestanas";
import { TablaDatos } from "@/components/ui/tabla";
import type { Proveedor } from "@/lib/tipos";
import { EditarProveedor } from "../nuevo-proveedor";

type PorMetal = {
  metal_id: string; metal: string; color: string | null; kg: number; importe: number; precio_promedio: number | null;
  n_compras?: number; n_ventas?: number; merma_kg?: number;
};

export const metadata: Metadata = { title: "Proveedor" };

export default async function ProveedorDetalle({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const pestana = tab === "compras" || tab === "metales" ? tab : "resumen";
  const { supabase, rol } = await obtenerContexto();
  const [{ data: p }, { data: compras }, { data: metales }] = await Promise.all([
    supabase.from("v_proveedores_resumen").select("*").eq("id", id).maybeSingle(),
    supabase.from("v_compras").select("*").eq("proveedor_id", id).order("fecha", { ascending: false }).limit(100),
    supabase.rpc("proveedor_por_metal", { p_proveedor: id }),
  ]);
  if (!p) notFound();
  const porMetal = (metales ?? []) as PorMetal[];
  const maxImporte = Math.max(...porMetal.map((m) => Number(m.importe)), 1);

  const historial = (
    <Tarjeta>
      <TituloTarjeta>Historial de compras</TituloTarjeta>
      <TablaDatos
        filas={compras ?? []}
        clave={(c) => c.id}
        enlace={(c) => `/compras/${c.id}`}
        vacio="Aún no hay compras."
        columnas={[
          { titulo: "N°", principal: true, celda: (c) => `#${c.numero}` },
          { titulo: "Fecha", celda: (c) => fechaHora(c.fecha) },
          { titulo: "Metales", celda: (c) => c.metales },
          { titulo: "Kg", alinear: "der", celda: (c) => <span className="cifra">{kg(c.kg_total)}</span> },
          { titulo: "Total", alinear: "der", principal: true, celda: (c) => <span className={c.estado === "anulada" ? "cifra text-stone-400 line-through" : "cifra"}>{soles(c.total)}</span> },
        ]}
      />
    </Tarjeta>
  );

  const tablaMetales = (
    <Tarjeta>
      <TituloTarjeta>Lo que nos vende, por metal</TituloTarjeta>
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
            <p className="cifra mt-1 text-xs text-stone-500">
              {kg(m.kg)} · {m.n_compras} compras · promedio {soles(m.precio_promedio)}/kg
            </p>
          </li>
        ))}
        {porMetal.length === 0 && <li className="px-4 py-6 text-center text-sm text-stone-500">Aún no hay compras.</li>}
      </ul>
    </Tarjeta>
  );

  return (
    <>
      <Link href="/proveedores" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Proveedores
      </Link>
      <Encabezado
        titulo={p.nombre}
        descripcion={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{p.nro_doc ? `${p.tipo_doc} ${p.nro_doc}` : "Sin documento"}</span>
            {p.telefono && (
              <a href={`tel:${p.telefono}`} className="inline-flex items-center gap-1 text-marca-700 hover:underline">
                <Phone className="size-3.5" /> {p.telefono}
              </a>
            )}
            {!p.activo && <Insignia>Inactivo</Insignia>}
          </span>
        }
        acciones={puede(rol, "editarTerceros") && <EditarProveedor proveedor={p as Proveedor} puedeDesactivar={puede(rol, "editarTerceros")} />}
      />

      <Pestanas
        base={`/proveedores/${id}`}
        actual={pestana}
        opciones={[
          { valor: "resumen", texto: "Resumen" },
          { valor: "compras", texto: "Compras", cantidad: p.n_compras },
          { valor: "metales", texto: "Por metal", cantidad: porMetal.length },
        ]}
      />

      {pestana === "resumen" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Compras" valor={p.n_compras} />
            <Kpi titulo="Kilos que nos vendió" valor={kg(p.kg_total)} />
            <Kpi titulo="Total pagado" valor={soles(p.importe_total)} />
            <Kpi titulo="Última compra" valor={fecha(p.ultima_compra)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta className="p-4">
              <dl className="grid grid-cols-2 gap-3">
                <Dato etiqueta="Documento">{p.nro_doc ? `${p.tipo_doc} ${p.nro_doc}` : "—"}</Dato>
                <Dato etiqueta="Teléfono">{p.telefono ?? "—"}</Dato>
                <Dato etiqueta="Dirección">{p.direccion ?? "—"}</Dato>
                <Dato etiqueta="Registrado">{fecha(p.creado_en)}</Dato>
                <Dato etiqueta="Estado">{p.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</Dato>
              </dl>
            </Tarjeta>
            {tablaMetales}
          </div>
        </>
      )}
      {pestana === "compras" && historial}
      {pestana === "metales" && tablaMetales}
    </>
  );
}
