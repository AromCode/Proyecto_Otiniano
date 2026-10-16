import type { Metadata } from "next";
import Link from "next/link";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { ETIQUETA_ORIGEN, fechaHora, soles } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros, rangoLima } from "@/components/filtros";
import { BotonAnular } from "@/components/boton-anular";
import { cx } from "@/components/ui/clases";
import { AccionesCaja } from "./acciones-caja";
import { anularGasto, anularTraspaso } from "./acciones";

export const metadata: Metadata = { title: "Caja" };

type Params = { vista?: string; caja?: string; desde?: string; hasta?: string; origen?: string };

const ENLACE_ORIGEN: Record<string, string> = { compra: "/compras/", venta: "/ventas/" };

export default async function CajaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const vista = sp.vista ?? "movimientos";
  const { supabase, empresa, rol } = await exigir("caja", "verTodo");
  const { desde, hasta } = rangoLima(sp.desde, sp.hasta);

  const [{ data: saldos }, { data: categorias }] = await Promise.all([
    supabase.from("v_saldo_caja").select("*").eq("empresa_id", empresa.id).order("orden"),
    supabase.from("categorias_gasto").select("id, nombre").eq("empresa_id", empresa.id).eq("activo", true).order("nombre"),
  ]);
  const total = (saldos ?? []).reduce((s, c) => s + Number(c.saldo), 0);

  const rango = <T extends { gte: (c: string, v: string) => T; lt: (c: string, v: string) => T }>(q: T) => {
    let r = q;
    if (desde) r = r.gte("fecha", desde);
    if (hasta) r = r.lt("fecha", hasta);
    return r;
  };

  let movimientos = null, gastos = null, traspasos = null, arqueos = null;
  if (vista === "movimientos") {
    let q = supabase.from("v_movimientos_caja").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).order("creado_en", { ascending: false }).limit(300);
    if (sp.caja) q = q.eq("caja_id", sp.caja);
    if (sp.origen) q = q.eq("origen", sp.origen);
    movimientos = (await rango(q)).data ?? [];
  } else if (vista === "gastos") {
    gastos = (await rango(supabase.from("v_gastos").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(300))).data ?? [];
  } else if (vista === "traspasos") {
    traspasos = (await rango(supabase.from("traspasos").select("*, origen:cajas!caja_origen_id(nombre), destino:cajas!caja_destino_id(nombre)").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(200))).data ?? [];
  } else {
    arqueos = (await rango(supabase.from("v_arqueos").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(200))).data ?? [];
  }

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
        descripcion={`Saldo total ${soles(total)}`}
        acciones={puede(rol, "caja") && (
          <AccionesCaja
            empresaId={empresa.id}
            cajas={(saldos ?? []).filter((c) => c.activo).map((c) => ({ id: c.caja_id, nombre: c.nombre, saldo: c.saldo }))}
            categorias={categorias ?? []}
            puedeAjustar={rol === "dueno"}
          />
        )}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(saldos ?? []).filter((c) => c.activo || Number(c.saldo) !== 0).map((c) => (
          <Link key={c.caja_id} href={`/caja?vista=movimientos&caja=${c.caja_id}`}>
            <Tarjeta className={cx("p-4 transition-colors hover:border-marca-200", sp.caja === c.caja_id && "border-marca-500")}>
              <p className="truncate text-xs font-medium uppercase tracking-wide text-stone-500">{c.nombre}</p>
              <p className={cx("cifra mt-1 text-xl font-semibold", Number(c.saldo) < 0 && "text-red-700")}>{soles(c.saldo)}</p>
              <p className="cifra mt-0.5 text-xs text-stone-500">+{soles(c.ingresos)} / −{soles(c.egresos)}</p>
            </Tarjeta>
          </Link>
        ))}
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-stone-200/70 p-1 sm:inline-flex">
        {pestana("movimientos", "Movimientos")}
        {pestana("gastos", "Gastos")}
        {pestana("traspasos", "Traspasos")}
        {pestana("arqueos", "Arqueos")}
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
      </Tarjeta>
    </>
  );
}
