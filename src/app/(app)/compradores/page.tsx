import type { Metadata } from "next";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { RankingTerceros } from "@/components/ranking-terceros";
import { fecha, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros } from "@/components/filtros";
import { NuevoComprador } from "./form-comprador";

export const metadata: Metadata = { title: "Clientes" };

export default async function CompradoresPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await exigir("verTodo", "vender");
  const { supabase, empresa, rol } = ctx;
  let q = supabase.from("v_compradores_resumen").select("*").eq("empresa_id", empresa.id)
    .order("activo", { ascending: false }).order("importe_total", { ascending: false }).limit(300);
  if (sp.estado === "inactivo") q = q.eq("activo", false);
  else if (sp.estado !== "todos") q = q.eq("activo", true);
  if (sp.q?.trim()) {
    const t = sp.q.trim().replace(/[%,()]/g, "");
    q = /^\d+$/.test(t) ? q.like("ruc", `${t}%`) : q.or(`razon_social.ilike.%${t}%,contacto.ilike.%${t}%`);
  }
  const { data } = await q;

  return (
    <>
      <Encabezado titulo="Clientes" descripcion="Compradores mayores (fundiciones, recicladoras) a quienes vendemos" acciones={puede(rol, "editarTerceros") && <NuevoComprador />} />
      {puede(rol, "verTodo") && <RankingTerceros ctx={ctx} tipo="clientes" sp={sp} ruta="/compradores" />}
      <Filtros
        valores={sp}
        desdeHasta={false}
        ocultos={Object.fromEntries(Object.entries(sp).filter((e): e is [string, string] => !!e[1] && ["rp", "rdesde", "rhasta", "rmetal"].includes(e[0])))}
        busqueda={{ nombre: "q", placeholder: "RUC, razón social o contacto" }}
        selects={[{ nombre: "estado", etiqueta: "Estado", opciones: [{ valor: "inactivo", texto: "Inactivos" }, { valor: "todos", texto: "Activos e inactivos" }] }]}
      />
      <Tarjeta>
        <TablaDatos
          filas={data ?? []}
          clave={(c) => c.id}
          enlace={(c) => `/compradores/${c.id}`}
          vacio="Sin clientes con esos filtros."
          columnas={[
            { titulo: "Razón social", principal: true, celda: (c) => <span className={c.activo ? "" : "text-stone-400"}>{c.razon_social}</span> },
            { titulo: "RUC", celda: (c) => c.ruc ?? "—" },
            { titulo: "Contacto", ocultarMovil: true, celda: (c) => c.contacto ?? "—" },
            { titulo: "Ventas", alinear: "der", celda: (c) => <span className="cifra">{c.n_ventas}</span> },
            { titulo: "Kg", alinear: "der", celda: (c) => <span className="cifra">{kg(c.kg_total)}</span> },
            { titulo: "Total", alinear: "der", principal: true, celda: (c) => <span className="cifra font-medium">{soles(c.importe_total)}</span> },
            { titulo: "Última", celda: (c) => fecha(c.ultima_venta) },
            { titulo: "Estado", ocultarMovil: true, celda: (c) => c.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia> },
          ]}
        />
      </Tarjeta>
    </>
  );
}
