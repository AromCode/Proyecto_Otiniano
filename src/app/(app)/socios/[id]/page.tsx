import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fechaHora, nombrePeriodo, periodoActual, porcentaje, soles } from "@/lib/formato";
import { Dato, Encabezado, Insignia, Kpi, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { Pestanas } from "@/components/ui/pestanas";
import { TablaDatos } from "@/components/ui/tabla";
import { EditarSocio } from "../formularios";

export const metadata: Metadata = { title: "Socio" };

export default async function SocioDetalle({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const pestana = tab === "movimientos" || tab === "utilidad" ? tab : "resumen";
  const { supabase, rol } = await exigir("verTodo");
  const [{ data: s }, { data: movs }, { data: utilidad }] = await Promise.all([
    supabase.from("v_capital_socio").select("*").eq("socio_id", id).maybeSingle(),
    supabase.from("v_aportes_retiros").select("*").eq("socio_id", id).order("fecha", { ascending: false }).limit(200),
    supabase.from("v_utilidad_socio").select("periodo, utilidad_empresa, utilidad_socio").eq("socio_id", id)
      .order("periodo", { ascending: false }).limit(24),
  ]);
  if (!s) notFound();
  const mes = utilidad?.find((u) => u.periodo === periodoActual());

  const tablaMovs = (
    <Tarjeta>
      <TituloTarjeta>Aportes y retiros</TituloTarjeta>
      <TablaDatos
        filas={movs ?? []}
        clave={(m) => m.id}
        vacio="Sin aportes ni retiros."
        columnas={[
          { titulo: "Fecha", celda: (m) => fechaHora(m.fecha) },
          {
            titulo: "Tipo", principal: true,
            celda: (m) => m.estado === "anulada"
              ? <Insignia tono="rojo">{m.tipo === "aporte" ? "Aporte" : "Retiro"} anulado</Insignia>
              : <Insignia tono={m.tipo === "aporte" ? "verde" : "ambar"}>{m.tipo === "aporte" ? "Aporte" : "Retiro"}</Insignia>,
          },
          { titulo: "Caja", celda: (m) => m.caja_nombre },
          { titulo: "Monto", alinear: "der", principal: true, celda: (m) => <span className={m.estado === "anulada" ? "cifra text-stone-500 line-through" : "cifra font-medium"}>{soles(m.monto)}</span> },
          { titulo: "Nota", celda: (m) => m.nota ?? "—" },
        ]}
      />
    </Tarjeta>
  );

  const tablaUtilidad = (
    <Tarjeta>
      <TituloTarjeta>Utilidad que le corresponde por mes</TituloTarjeta>
      <TablaDatos
        filas={utilidad ?? []}
        clave={(u) => u.periodo}
        vacio="Aún no hay meses con resultado."
        columnas={[
          { titulo: "Mes", principal: true, celda: (u) => nombrePeriodo(u.periodo) },
          { titulo: "Utilidad empresa", alinear: "der", celda: (u) => <span className="cifra">{soles(u.utilidad_empresa)}</span> },
          { titulo: `Su parte (${porcentaje(s.porcentaje)})`, alinear: "der", principal: true, celda: (u) => <span className="cifra font-medium">{soles(u.utilidad_socio)}</span> },
        ]}
      />
    </Tarjeta>
  );

  return (
    <>
      <Link href="/socios" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Socios
      </Link>
      <Encabezado
        titulo={s.nombre}
        descripcion={<span className="flex flex-wrap items-center gap-2">{s.dni ? `DNI ${s.dni}` : "Sin DNI"} {!s.activo && <Insignia>Inactivo</Insignia>}</span>}
        acciones={puede(rol, "socios") && <EditarSocio socio={{ id: s.socio_id, nombre: s.nombre, dni: s.dni, porcentaje: s.porcentaje, activo: s.activo }} />}
      />
      <Pestanas
        base={`/socios/${id}`}
        actual={pestana}
        opciones={[
          { valor: "resumen", texto: "Resumen" },
          { valor: "movimientos", texto: "Aportes y retiros", cantidad: (movs ?? []).length },
          { valor: "utilidad", texto: "Utilidad" },
        ]}
      />
      {pestana === "resumen" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Participación" valor={porcentaje(s.porcentaje)} />
            <Kpi titulo="Capital" valor={soles(s.capital)} detalle={`${soles(s.aportes)} aportes − ${soles(s.retiros)} retiros`} />
            <Kpi
              titulo={`Utilidad ${nombrePeriodo(periodoActual())}`}
              valor={soles(mes?.utilidad_socio ?? 0)}
              tono={Number(mes?.utilidad_socio ?? 0) >= 0 ? "positivo" : "negativo"}
              detalle="Informativo, según su %"
            />
            <Kpi titulo="Movimientos" valor={(movs ?? []).length} />
          </div>
          <Tarjeta className="p-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato etiqueta="Nombre">{s.nombre}</Dato>
              <Dato etiqueta="DNI">{s.dni ?? "—"}</Dato>
              <Dato etiqueta="Participación">{porcentaje(s.porcentaje)}</Dato>
              <Dato etiqueta="Estado">{s.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</Dato>
            </dl>
          </Tarjeta>
        </>
      )}
      {pestana === "movimientos" && tablaMovs}
      {pestana === "utilidad" && tablaUtilidad}
    </>
  );
}
