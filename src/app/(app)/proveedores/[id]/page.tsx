import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fecha, fechaHora, kg, soles } from "@/lib/formato";
import { Dato, Encabezado, Insignia, Kpi, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import type { Proveedor } from "@/lib/tipos";
import { EditarProveedor } from "../nuevo-proveedor";

export const metadata: Metadata = { title: "Proveedor" };

export default async function ProveedorDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, rol } = await obtenerContexto();
  const [{ data: p }, { data: compras }, { data: porMetal }] = await Promise.all([
    supabase.from("v_proveedores_resumen").select("*").eq("id", id).maybeSingle(),
    supabase.from("v_compras").select("*").eq("proveedor_id", id).order("fecha", { ascending: false }).limit(100),
    supabase.from("v_compra_items").select("metal_nombre, peso_neto_kg, importe").eq("proveedor_id", id).eq("estado", "registrada"),
  ]);
  if (!p) notFound();

  // Resumen por metal de este proveedor
  const metales = new Map<string, { kg: number; importe: number }>();
  for (const i of porMetal ?? []) {
    const m = metales.get(i.metal_nombre) ?? { kg: 0, importe: 0 };
    m.kg += Number(i.peso_neto_kg);
    m.importe += Number(i.importe);
    metales.set(i.metal_nombre, m);
  }

  return (
    <>
      <Link href="/proveedores" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Proveedores
      </Link>
      <Encabezado
        titulo={p.nombre}
        descripcion={p.nro_doc ? `${p.tipo_doc} ${p.nro_doc}` : "Sin documento"}
        acciones={puede(rol, "editarTerceros") && <EditarProveedor proveedor={p as Proveedor} puedeDesactivar={puede(rol, "editarTerceros")} />}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Compras" valor={p.n_compras} />
        <Kpi titulo="Kilos vendidos a nosotros" valor={kg(p.kg_total)} />
        <Kpi titulo="Total pagado" valor={soles(p.importe_total)} />
        <Kpi titulo="Última compra" valor={fecha(p.ultima_compra)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta className="lg:col-span-2">
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
        <div className="space-y-4">
          <Tarjeta className="p-4">
            <dl className="grid grid-cols-2 gap-3">
              <Dato etiqueta="Teléfono">{p.telefono ?? "—"}</Dato>
              <Dato etiqueta="Estado">{p.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</Dato>
              <Dato etiqueta="Dirección">{p.direccion ?? "—"}</Dato>
              <Dato etiqueta="Registrado">{fecha(p.creado_en)}</Dato>
            </dl>
          </Tarjeta>
          <Tarjeta>
            <TituloTarjeta>Por metal</TituloTarjeta>
            <ul className="divide-y divide-stone-100 text-sm">
              {[...metales.entries()].map(([nombre, m]) => (
                <li key={nombre} className="flex justify-between gap-2 px-4 py-2">
                  <span>{nombre}</span>
                  <span className="cifra text-right">{kg(m.kg)} · {soles(m.importe)}</span>
                </li>
              ))}
              {metales.size === 0 && <li className="px-4 py-4 text-stone-500">—</li>}
            </ul>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
