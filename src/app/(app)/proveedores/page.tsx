import type { Metadata } from "next";
import { obtenerContexto } from "@/lib/contexto";
import { fecha, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros } from "@/components/filtros";
import { NuevoProveedor } from "./nuevo-proveedor";

export const metadata: Metadata = { title: "Proveedores" };

export default async function ProveedoresPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const sp = await searchParams;
  const { supabase, empresa } = await obtenerContexto();
  let q = supabase.from("v_proveedores_resumen").select("*").eq("empresa_id", empresa.id)
    .order("importe_total", { ascending: false }).limit(300);
  if (sp.estado === "inactivo") q = q.eq("activo", false);
  else if (sp.estado !== "todos") q = q.eq("activo", true);
  if (sp.q?.trim()) {
    const t = sp.q.trim().replace(/[%,()]/g, "");
    q = /^\d+$/.test(t) ? q.like("nro_doc", `${t}%`) : q.ilike("nombre", `%${t}%`);
  }
  const { data } = await q;

  return (
    <>
      <Encabezado titulo="Proveedores" descripcion="Personas y empresas que nos venden metal" acciones={<NuevoProveedor />} />
      <Filtros
        valores={sp}
        desdeHasta={false}
        busqueda={{ nombre: "q", placeholder: "DNI, RUC o nombre" }}
        selects={[{ nombre: "estado", etiqueta: "Estado", opciones: [{ valor: "inactivo", texto: "Inactivos" }, { valor: "todos", texto: "Activos e inactivos" }] }]}
      />
      <Tarjeta>
        <TablaDatos
          filas={data ?? []}
          clave={(p) => p.id}
          enlace={(p) => `/proveedores/${p.id}`}
          vacio="Sin proveedores."
          columnas={[
            { titulo: "Nombre", principal: true, celda: (p) => <span className={p.activo ? "" : "text-stone-400"}>{p.nombre}</span> },
            { titulo: "Documento", celda: (p) => p.nro_doc ? `${p.tipo_doc} ${p.nro_doc}` : "Sin documento" },
            { titulo: "Teléfono", celda: (p) => p.telefono ?? "—", ocultarMovil: true },
            { titulo: "Compras", alinear: "der", celda: (p) => <span className="cifra">{p.n_compras}</span> },
            { titulo: "Kg", alinear: "der", celda: (p) => <span className="cifra">{kg(p.kg_total)}</span> },
            { titulo: "Total", alinear: "der", principal: true, celda: (p) => <span className="cifra font-medium">{soles(p.importe_total)}</span> },
            { titulo: "Última", celda: (p) => fecha(p.ultima_compra) },
            { titulo: "Estado", ocultarMovil: true, celda: (p) => p.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia> },
          ]}
        />
      </Tarjeta>
    </>
  );
}
