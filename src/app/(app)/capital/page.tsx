import type { Metadata } from "next";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fecha, fechaHora, nombrePeriodo, periodoActual, porcentaje, soles } from "@/lib/formato";
import { Aviso, Encabezado, Insignia, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { PanelModulo } from "@/components/panel-modulo";
import { TablaDatos } from "@/components/ui/tabla";
import { BotonAnular } from "@/components/boton-anular";
import Link from "next/link";
import { anularAporteRetiro, reabrirMes } from "../socios/acciones";
import { AporteRetiro, CerrarMes } from "../socios/formularios";

export const metadata: Metadata = { title: "Capital y cierres" };

function ultimosPeriodos(n: number) {
  const [a, m] = periodoActual().split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export default async function CapitalPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const periodo = sp.periodo && /^\d{4}-\d{2}$/.test(sp.periodo) ? sp.periodo : periodoActual();
  const { supabase, empresa, rol } = await exigir("verTodo");
  const esDueno = puede(rol, "socios");

  const [{ data: socios }, { data: utilidad }, { data: movs }, { data: cajas }, { data: cierres }, { data: patrimonio }] = await Promise.all([
    supabase.from("v_capital_socio").select("*").eq("empresa_id", empresa.id).order("porcentaje", { ascending: false }),
    supabase.from("v_utilidad_socio").select("*").eq("empresa_id", empresa.id).eq("periodo", periodo),
    supabase.from("v_aportes_retiros").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(100),
    supabase.from("cajas").select("id, nombre").eq("empresa_id", empresa.id).eq("activo", true).order("orden"),
    supabase.from("cierres_mes").select("*").eq("empresa_id", empresa.id).order("periodo", { ascending: false }),
    supabase.from("v_patrimonio").select("*").eq("empresa_id", empresa.id).maybeSingle(),
  ]);
  const sumaPct = (socios ?? []).filter((s) => s.activo).reduce((s, x) => s + Number(x.porcentaje), 0);
  const utilidadDe = (id: string) => utilidad?.find((u) => u.socio_id === id);
  const cerrados = new Set((cierres ?? []).filter((c) => c.estado === "cerrado").map((c) => c.periodo));
  const capital = Number(patrimonio?.capital ?? 0);
  const ganancia = Number(patrimonio?.ganancia_acumulada ?? 0);
  const utilidadMes = Number(utilidad?.[0]?.utilidad_empresa ?? 0);

  return (
    <>
      <Encabezado
        titulo="Capital y cierres"
        descripcion="Capital = aportes − retiros. La utilidad se reparte según el % de cada socio (informativo)."
        acciones={esDueno && (
          <AporteRetiro socios={(socios ?? []).filter((s) => s.activo).map((s) => ({ id: s.socio_id, nombre: s.nombre }))} cajas={cajas ?? []} />
        )}
      />

      <PanelModulo
        tono="caja"
        etiqueta="Capital · hoy"
        insignia={capital > 0 ? `${ganancia >= 0 ? "▲" : "▼"} ${porcentaje(Math.abs((ganancia / capital) * 100))} sobre el capital` : undefined}
        principal={{
          titulo: "Capital aportado", valor: soles(capital),
          detalle: `${soles(patrimonio?.aportes)} aportes − ${soles(patrimonio?.retiros)} retiros`,
        }}
        celdas={[
          { titulo: "Lo que tenemos", valor: soles(patrimonio?.activos), detalle: "Caja + stock a costo + en tránsito" },
          { titulo: "Ganancia acumulada", valor: soles(ganancia), negativo: ganancia < 0, detalle: "Desde el inicio del negocio" },
          {
            titulo: `Utilidad ${nombrePeriodo(periodo)}`, valor: soles(utilidadMes), negativo: utilidadMes < 0,
            detalle: cerrados.has(periodo) ? "Mes cerrado" : "Mes abierto",
          },
        ]}
      />

      {Math.abs(sumaPct - 100) > 0.001 && (socios?.length ?? 0) > 0 && (
        <div className="mb-4"><Aviso>Los porcentajes de los socios activos suman {porcentaje(sumaPct)}; deberían sumar 100 %.</Aviso></div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <TituloTarjeta accion={
            <form method="get">
              <select name="periodo" defaultValue={periodo} className="rounded-md border border-stone-200 bg-superficie px-2 py-1 text-xs">
                {ultimosPeriodos(18).map((p) => <option key={p} value={p}>{nombrePeriodo(p)}</option>)}
              </select>
              <button className="ml-1 text-xs font-medium text-marca-700">Ver</button>
            </form>
          }>
            Capital por socio
          </TituloTarjeta>
          <TablaDatos
            filas={socios ?? []}
            clave={(s) => s.socio_id}
            enlace={(s) => `/socios/${s.socio_id}`}
            vacio={<>Registre a los socios en <Link href="/socios" className="font-medium underline">Contactos → Socios</Link>.</>}
            columnas={[
              { titulo: "Socio", principal: true, celda: (s) => <span className={s.activo ? "" : "text-stone-400"}>{s.nombre}</span> },
              { titulo: "%", alinear: "der", celda: (s) => <span className="cifra">{porcentaje(s.porcentaje)}</span> },
              { titulo: "Capital", alinear: "der", principal: true, celda: (s) => <span className="cifra font-medium">{soles(s.capital)}</span> },
              { titulo: `Utilidad ${periodo}`, alinear: "der", celda: (s) => <span className="cifra">{soles(utilidadDe(s.socio_id)?.utilidad_socio ?? 0)}</span> },
            ]}
          />
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta accion={esDueno && <CerrarMes periodos={ultimosPeriodos(6).filter((p) => !cerrados.has(p))} />}>
            Cierres de mes
          </TituloTarjeta>
          <TablaDatos
            filas={cierres ?? []}
            clave={(c) => c.id}
            vacio="Aún no se ha cerrado ningún mes."
            columnas={[
              { titulo: "Periodo", principal: true, celda: (c) => nombrePeriodo(c.periodo) },
              { titulo: "Estado", celda: (c) => c.estado === "cerrado" ? <Insignia tono="azul">Cerrado</Insignia> : <Insignia tono="ambar">Reabierto</Insignia> },
              { titulo: "Utilidad", alinear: "der", principal: true, celda: (c) => <span className="cifra">{soles(c.snapshot?.resultado?.utilidad ?? 0)}</span> },
              { titulo: "Cerrado", celda: (c) => fecha(c.cerrado_en) },
              {
                titulo: "", celda: (c) => c.estado === "cerrado" && esDueno
                  ? <BotonAnular id={c.periodo} accion={reabrirMes} titulo={`Reabrir ${nombrePeriodo(c.periodo)}`} explicacion="Se podrán volver a registrar y anular movimientos de ese mes." etiqueta="Reabrir" textoConfirmar="Reabrir mes" />
                  : c.motivo_reapertura ? <span className="text-xs text-stone-500">{c.motivo_reapertura}</span> : null,
              },
            ]}
          />
        </Tarjeta>
      </div>

      <Tarjeta className="mt-4">
        <TituloTarjeta>Aportes y retiros</TituloTarjeta>
        <TablaDatos
          filas={movs ?? []}
          clave={(m) => m.id}
          vacio="Sin movimientos de socios."
          columnas={[
            { titulo: "Fecha", celda: (m) => fechaHora(m.fecha) },
            { titulo: "Socio", principal: true, celda: (m) => m.socio_nombre },
            { titulo: "Tipo", celda: (m) => <Insignia tono={m.tipo === "aporte" ? "verde" : "ambar"}>{m.tipo === "aporte" ? "Aporte" : "Retiro"}</Insignia> },
            { titulo: "Caja", celda: (m) => m.caja_nombre },
            { titulo: "Monto", alinear: "der", principal: true, celda: (m) => <span className={m.estado === "anulada" ? "cifra text-stone-500 line-through" : "cifra font-medium"}>{soles(m.monto)}</span> },
            { titulo: "Nota", celda: (m) => m.nota ?? "—" },
            {
              titulo: "", celda: (m) => m.estado === "anulada"
                ? <Insignia tono="rojo">Anulado</Insignia>
                : esDueno && <BotonAnular id={m.id} accion={anularAporteRetiro} titulo="Anular movimiento de socio" />,
            },
          ]}
        />
      </Tarjeta>
    </>
  );
}
