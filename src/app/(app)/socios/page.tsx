import type { Metadata } from "next";
import Link from "next/link";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { porcentaje, soles } from "@/lib/formato";
import { Aviso, Encabezado, Insignia, Tarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros } from "@/components/filtros";
import { NuevoSocio } from "./formularios";

export const metadata: Metadata = { title: "Socios" };

export default async function SociosPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const sp = await searchParams;
  const { supabase, empresa, rol } = await exigir("verTodo");

  let q = supabase.from("v_capital_socio").select("*").eq("empresa_id", empresa.id)
    .order("activo", { ascending: false }).order("porcentaje", { ascending: false });
  if (sp.estado === "inactivo") q = q.eq("activo", false);
  else if (sp.estado !== "todos") q = q.eq("activo", true);
  if (sp.q?.trim()) {
    const t = sp.q.trim().replace(/[%,()]/g, "");
    q = /^\d+$/.test(t) ? q.like("dni", `${t}%`) : q.ilike("nombre", `%${t}%`);
  }
  // La suma de % se valida siempre sobre TODOS los activos, no sobre el filtro
  const [{ data }, { data: activos }] = await Promise.all([
    q,
    supabase.from("socios").select("porcentaje").eq("empresa_id", empresa.id).eq("activo", true),
  ]);
  const sumaPct = (activos ?? []).reduce((s, x) => s + Number(x.porcentaje), 0);

  return (
    <>
      <Encabezado
        titulo="Socios"
        descripcion={<>Quiénes son dueños del negocio y con qué %. El dinero (aportes, retiros, cierres) está en <Link href="/capital" className="font-medium text-marca-700 hover:underline">Capital y cierres</Link>.</>}
        acciones={puede(rol, "socios") && <NuevoSocio />}
      />
      {(activos ?? []).length > 0 && Math.abs(sumaPct - 100) > 0.001 && (
        <div className="mb-4"><Aviso>Los porcentajes de los socios activos suman {porcentaje(sumaPct)}; deberían sumar 100 %.</Aviso></div>
      )}
      <Filtros
        valores={sp}
        desdeHasta={false}
        busqueda={{ nombre: "q", placeholder: "DNI o nombre" }}
        selects={[{ nombre: "estado", etiqueta: "Estado", opciones: [{ valor: "inactivo", texto: "Inactivos" }, { valor: "todos", texto: "Activos e inactivos" }] }]}
      />
      <Tarjeta>
        <TablaDatos
          filas={data ?? []}
          clave={(s) => s.socio_id}
          enlace={(s) => `/socios/${s.socio_id}`}
          vacio="Sin socios con esos filtros."
          columnas={[
            { titulo: "Nombre", principal: true, celda: (s) => <span className={s.activo ? "" : "text-stone-400"}>{s.nombre}</span> },
            { titulo: "DNI", celda: (s) => s.dni ?? "—" },
            { titulo: "Participación", alinear: "der", celda: (s) => <span className="cifra">{porcentaje(s.porcentaje)}</span> },
            { titulo: "Capital", alinear: "der", principal: true, celda: (s) => <span className="cifra font-medium">{soles(s.capital)}</span> },
            { titulo: "Estado", ocultarMovil: true, celda: (s) => s.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia> },
          ]}
        />
      </Tarjeta>
    </>
  );
}
