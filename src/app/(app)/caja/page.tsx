import type { Metadata } from "next";
import Link from "next/link";
import { LockOpen } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { ETIQUETA_ORIGEN, fechaHora, soles } from "@/lib/formato";
import { Aviso, Encabezado, Insignia, Tarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros, rangoLima } from "@/components/filtros";
import { BotonAnular } from "@/components/boton-anular";
import { cx } from "@/components/ui/clases";
import { PanelModulo, TituloSeccion } from "@/components/panel-modulo";
import { BotonImprimir80 } from "@/components/ticket/boton-imprimir-80";
import { AccionesCaja } from "./acciones-caja";
import { anularGasto, anularTraspaso } from "./acciones";

export const metadata: Metadata = { title: "Caja" };

type Params = { vista?: string; caja?: string; desde?: string; hasta?: string; origen?: string };

const ENLACE_ORIGEN: Record<string, string> = { compra: "/compras/", venta: "/ventas/" };
const TITULO_VISTA: Record<string, string> = { movimientos: "Movimientos de caja", gastos: "Gastos", traspasos: "Traspasos entre cajas", arqueos: "Arqueos", cierres: "Aperturas y cierres de caja" };

export default async function CajaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const vista = sp.vista ?? "movimientos";
  const { supabase, empresa, rol } = await exigir("caja", "verTodo");
  const { desde, hasta } = rangoLima(sp.desde, sp.hasta);

  const rango = <T extends { gte: (c: string, v: string) => T; lt: (c: string, v: string) => T }>(q: T) => {
    let r = q;
    if (desde) r = r.gte("fecha", desde);
    if (hasta) r = r.lt("fecha", hasta);
    return r;
  };
  const rangoTurnos = <T extends { gte: (c: string, v: string) => T; lt: (c: string, v: string) => T }>(q: T) => {
    let r = q;
    if (desde) r = r.gte("abierto_en", desde);
    if (hasta) r = r.lt("abierto_en", hasta);
    return r;
  };

  // Solo la lista de la pestaña activa; todo en paralelo con los saldos
  const esArqueos = !["movimientos", "gastos", "traspasos", "cierres"].includes(vista);
  let qMov = supabase.from("v_movimientos_caja").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).order("creado_en", { ascending: false }).limit(300);
  if (sp.caja) qMov = qMov.eq("caja_id", sp.caja);
  if (sp.origen) qMov = qMov.eq("origen", sp.origen);

  const [{ data: saldos }, { data: categorias }, { data: abiertos }, rMov, rGas, rTra, rArq, rTur] = await Promise.all([
    supabase.from("v_saldo_caja").select("*").eq("empresa_id", empresa.id).order("orden"),
    supabase.from("categorias_gasto").select("id, nombre").eq("empresa_id", empresa.id).eq("activo", true).order("nombre"),
    supabase.from("v_turnos_caja").select("id, numero, caja_id, caja_nombre, abierto_en, abierto_por_nombre").eq("empresa_id", empresa.id).is("cerrado_en", null).order("abierto_en"),
    vista === "movimientos" ? rango(qMov) : null,
    vista === "gastos" ? rango(supabase.from("v_gastos").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(300)) : null,
    vista === "traspasos" ? rango(supabase.from("traspasos").select("*, origen:cajas!caja_origen_id(nombre), destino:cajas!caja_destino_id(nombre)").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(200)) : null,
    esArqueos ? rango(supabase.from("v_arqueos").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(200)) : null,
    vista === "cierres" ? rangoTurnos(supabase.from("v_turnos_caja").select("*").eq("empresa_id", empresa.id).order("abierto_en", { ascending: false }).limit(200)) : null,
  ]);
  const total = (saldos ?? []).reduce((s, c) => s + Number(c.saldo), 0);
  const cajasVisibles = (saldos ?? []).filter((c) => c.activo || Number(c.saldo) !== 0);
  const movimientos = rMov ? rMov.data ?? [] : null;
  const gastos = rGas ? rGas.data ?? [] : null;
  const traspasos = rTra ? rTra.data ?? [] : null;
  const arqueos = rArq ? rArq.data ?? [] : null;
  const turnos = rTur ? rTur.data ?? [] : null;
  const turnosAbiertos = abiertos ?? [];

  const pestana = (v: string, t: string) => (
    <Link
      key={v}
      href={`/caja?vista=${v}`}
      className={cx("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium", vista === v ? "bg-superficie shadow-sm" : "text-stone-600 hover:text-stone-900")}
    >
      {t}
    </Link>
  );

  return (
    <>
      <Encabezado
        titulo="Caja"
        descripcion="Entradas y salidas de dinero, gastos, traspasos y arqueos de cada caja"
        acciones={puede(rol, "caja") && (
          <AccionesCaja
            empresaId={empresa.id}
            cajas={(saldos ?? []).filter((c) => c.activo).map((c) => ({ id: c.caja_id, nombre: c.nombre, saldo: c.saldo }))}
            categorias={categorias ?? []}
            puedeAjustar={rol === "dueno"}
            turnos={turnosAbiertos.map((t) => ({ id: t.id!, numero: t.numero!, caja_id: t.caja_id!, caja_nombre: t.caja_nombre!, abierto_en: t.abierto_en! }))}
          />
        )}
      />

      {/* Cada caja filtra los movimientos; el total quita el filtro */}
      <PanelModulo
        tono="sky"
        etiqueta="Caja · hoy"
        principal={{
          titulo: "Saldo total", valor: soles(total), negativo: total < 0,
          detalle: sp.caja ? "Ver movimientos de todas las cajas" : `${cajasVisibles.length} caja(s)`,
          href: sp.caja ? "/caja?vista=movimientos" : undefined,
        }}
        celdas={cajasVisibles.map((c) => ({
          titulo: c.nombre, valor: soles(c.saldo), negativo: Number(c.saldo) < 0, activa: sp.caja === c.caja_id,
          detalle: <span className="cifra">+{soles(c.ingresos)} / −{soles(c.egresos)}</span>,
          href: `/caja?vista=movimientos&caja=${c.caja_id}`,
        }))}
      />

      {/* Turno en curso: quién abrió y desde cuándo; el corte parcial se imprime sin cerrar */}
      <div className="mb-4 space-y-2">
        {turnosAbiertos.length === 0 && puede(rol, "caja") && (
          <Aviso>Ninguna caja abierta. Use <b>Abrir caja</b> al empezar el día y <b>Cerrar caja</b> al terminar para imprimir el cuadre.</Aviso>
        )}
        {turnosAbiertos.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
            <span className="inline-flex items-center gap-2">
              <LockOpen className="size-4 shrink-0" />
              <span><b>{t.caja_nombre}</b> abierta desde {fechaHora(t.abierto_en)}{t.abierto_por_nombre ? ` por ${t.abierto_por_nombre}` : ""} · turno N° {t.numero}</span>
            </span>
            <BotonImprimir80 href={`/imprimir/cierre/${t.id}`} texto="Corte parcial" className="inline-flex items-center gap-1.5 font-medium hover:underline" />
          </div>
        ))}
      </div>

      <TituloSeccion titulo={TITULO_VISTA[vista] ?? "Arqueos"} />
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-stone-200/70 p-1 sm:inline-flex">
        {pestana("movimientos", "Movimientos")}
        {pestana("gastos", "Gastos")}
        {pestana("traspasos", "Traspasos")}
        {pestana("arqueos", "Arqueos")}
        {pestana("cierres", "Cierres")}
      </div>

      <Filtros
        valores={sp}
        ocultos={{ vista }}
        selects={vista === "movimientos" ? [
          { nombre: "caja", etiqueta: "Caja", opciones: (saldos ?? []).map((c) => ({ valor: c.caja_id, texto: c.nombre })) },
          { nombre: "origen", etiqueta: "Origen", opciones: ["compra", "venta", "gasto", "aporte", "retiro", "traspaso", "ajuste"].map((o) => ({ valor: o, texto: ETIQUETA_ORIGEN[o] })) },
        ] : []}
      />

      <Tarjeta>
        {movimientos && (
          <TablaDatos
            filas={movimientos}
            clave={(m) => m.id}
            vacio="Sin movimientos."
            columnas={[
              { titulo: "Fecha", celda: (m) => fechaHora(m.fecha) },
              { titulo: "Caja", celda: (m) => m.caja_nombre },
              { titulo: "Origen", celda: (m) => <Insignia tono={m.tipo === "ingreso" ? "verde" : "gris"}>{ETIQUETA_ORIGEN[m.origen]}</Insignia> },
              {
                titulo: "Concepto", principal: true,
                celda: (m) => ENLACE_ORIGEN[m.origen] && m.origen_id
                  ? <Link className="text-marca-700 hover:underline" href={`${ENLACE_ORIGEN[m.origen]}${m.origen_id}`}>{m.concepto}</Link>
                  : m.concepto,
              },
              {
                titulo: "Monto", alinear: "der", principal: true,
                celda: (m) => (
                  <span className={cx("cifra font-medium", m.anulado ? "text-stone-400 line-through" : m.tipo === "ingreso" ? "text-emerald-700" : "text-red-700")}>
                    {m.tipo === "ingreso" ? "+" : "−"}{soles(m.monto)}
                  </span>
                ),
              },
              { titulo: "Saldo caja", alinear: "der", celda: (m) => <span className="cifra">{soles(m.saldo_acumulado)}</span> },
            ]}
          />
        )}
        {gastos && (
          <TablaDatos
            filas={gastos}
            clave={(g) => g.id}
            vacio="Sin gastos."
            columnas={[
              { titulo: "Fecha", celda: (g) => fechaHora(g.fecha) },
              { titulo: "Concepto", principal: true, celda: (g) => <span className={g.estado === "anulada" ? "text-stone-400 line-through" : ""}>{g.concepto}</span> },
              { titulo: "Categoría", celda: (g) => g.categoria_nombre ?? "—" },
              { titulo: "Caja", celda: (g) => g.caja_nombre },
              { titulo: "Monto", alinear: "der", principal: true, celda: (g) => <span className="cifra">{soles(g.monto)}</span> },
              {
                titulo: "", celda: (g) => g.estado === "anulada"
                  ? <Insignia tono="rojo">Anulado</Insignia>
                  : puede(rol, "anular") && <BotonAnular id={g.id} accion={anularGasto} titulo="Anular gasto" />,
              },
            ]}
          />
        )}
        {traspasos && (
          <TablaDatos
            filas={traspasos}
            clave={(t) => t.id}
            vacio="Sin traspasos."
            columnas={[
              { titulo: "Fecha", celda: (t) => fechaHora(t.fecha) },
              { titulo: "Desde → Hacia", principal: true, celda: (t) => `${(t.origen as { nombre: string }).nombre} → ${(t.destino as { nombre: string }).nombre}` },
              { titulo: "Concepto", celda: (t) => t.concepto ?? "—" },
              { titulo: "Monto", alinear: "der", principal: true, celda: (t) => <span className={cx("cifra", t.estado === "anulada" && "text-stone-400 line-through")}>{soles(t.monto)}</span> },
              {
                titulo: "", celda: (t) => t.estado === "anulada"
                  ? <Insignia tono="rojo">Anulado</Insignia>
                  : puede(rol, "anular") && <BotonAnular id={t.id} accion={anularTraspaso} titulo="Anular traspaso" />,
              },
            ]}
          />
        )}
        {arqueos && (
          <TablaDatos
            filas={arqueos}
            clave={(a) => a.id}
            vacio="Sin arqueos."
            columnas={[
              { titulo: "Fecha", principal: true, celda: (a) => fechaHora(a.fecha) },
              { titulo: "Caja", celda: (a) => a.caja_nombre },
              { titulo: "Sistema", alinear: "der", celda: (a) => <span className="cifra">{soles(a.saldo_sistema)}</span> },
              { titulo: "Contado", alinear: "der", celda: (a) => <span className="cifra">{soles(a.contado)}</span> },
              { titulo: "Diferencia", alinear: "der", principal: true, celda: (a) => <span className={cx("cifra font-medium", Number(a.diferencia) < 0 ? "text-red-700" : Number(a.diferencia) > 0 ? "text-emerald-700" : "")}>{soles(a.diferencia)}</span> },
              { titulo: "Nota", celda: (a) => a.nota ?? "—" },
            ]}
          />
        )}
        {turnos && (
          <TablaDatos
            filas={turnos}
            clave={(t) => t.id!}
            vacio="Sin aperturas ni cierres en el rango."
            columnas={[
              { titulo: "Turno", principal: true, celda: (t) => <span className="font-medium">N° {t.numero} · {t.caja_nombre}</span> },
              { titulo: "Apertura", celda: (t) => <>{fechaHora(t.abierto_en)}{t.abierto_por_nombre && <span className="block text-xs text-stone-500">{t.abierto_por_nombre}</span>}</> },
              {
                titulo: "Cierre",
                celda: (t) => t.cerrado_en
                  ? <>{fechaHora(t.cerrado_en)}{t.cerrado_por_nombre && <span className="block text-xs text-stone-500">{t.cerrado_por_nombre}</span>}</>
                  : <Insignia tono="verde">Abierta</Insignia>,
              },
              { titulo: "Inicio", alinear: "der", celda: (t) => <span className="cifra">{soles(t.contado_apertura)}</span> },
              { titulo: "Sistema", alinear: "der", celda: (t) => t.cerrado_en ? <span className="cifra">{soles(t.saldo_cierre)}</span> : "—" },
              { titulo: "Contado", alinear: "der", celda: (t) => t.cerrado_en ? <span className="cifra">{soles(t.contado_cierre)}</span> : "—" },
              {
                titulo: "Diferencia", alinear: "der", principal: true,
                celda: (t) => t.cerrado_en
                  ? <span className={cx("cifra font-medium", Number(t.diferencia_cierre) < 0 ? "text-red-700" : Number(t.diferencia_cierre) > 0 ? "text-emerald-700" : "")}>{soles(t.diferencia_cierre)}</span>
                  : "—",
              },
              {
                titulo: "",
                celda: (t) => <BotonImprimir80 href={`/imprimir/cierre/${t.id}`} texto={t.cerrado_en ? "Imprimir" : "Corte"} className="inline-flex items-center gap-1.5 text-sm font-medium text-marca-700 hover:underline" />,
              },
            ]}
          />
        )}
      </Tarjeta>
    </>
  );
}
