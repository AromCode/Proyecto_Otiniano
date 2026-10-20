import type { Metadata } from "next";
import Link from "next/link";
import { Scale, Truck } from "lucide-react";
import { obtenerContexto, type Contexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { hoyLima, kg, porcentaje, soles } from "@/lib/formato";
import { Aviso, Kpi, PuntoMetal, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { BotonLink } from "@/components/ui/boton";
import { TablaDatos } from "@/components/ui/tabla";
import { GraficoStock } from "@/components/graficos";
import { TortaPorMetal, type FilaMes } from "@/components/graficos-dashboard";
import { InicioOperativo } from "./inicio-operativo";
import { leerFiltroInicio, type FiltroInicio } from "./filtro-inicio";
import { Actualizable, BarraFiltroInicio, SeccionCurva, SeccionEvolucion, ZonaFiltrada, type DiaSerie } from "./filtro-inicio-cliente";

export const metadata: Metadata = { title: "Inicio" };

interface Dashboard {
  caja: number; stock_costo: number; stock_precio_venta: number; en_transito: number; por_cobrar: number; capital: number;
  activos: number; ganancia_acumulada: number; ventas_pendientes: number; por_seleccionar: number; selecciones_retrasadas: number;
}

interface DashboardRango {
  compras_n: number; compras_kg: number; compras: number; ventas_n: number; ventas_kg: number; ventas: number;
  costo_ventas: number; margen_bruto: number; merma: number; gastos: number; ajustes_caja: number; utilidad: number;
  por_metal: { nombre: string; color: string | null; kg_comprado: number; compras: number; kg_vendido: number; ventas: number; margen: number }[];
}

export default async function Inicio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await obtenerContexto();
  const { rol, nombre } = ctx;
  // Cajero y balancero: inicio de trabajo diario (botones grandes); dueño y socios: el resumen de gestión
  if (!puede(rol, "verTodo")) return <InicioOperativo ctx={ctx} />;

  const f = leerFiltroInicio(await searchParams);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">Hola, {nombre}</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">¿Cuánto tenemos?</h1>
        </div>
        <div className="hidden gap-2 sm:flex">
          {puede(rol, "comprar") && <BotonLink href="/comprar"><Scale className="size-4" /> Comprar</BotonLink>}
          {puede(rol, "vender") && <BotonLink href="/vender" variante="secundario"><Truck className="size-4" /> Vender</BotonLink>}
        </div>
      </div>

      {/* Sin <Suspense> internos: los bloques se consultan en paralelo y la página llega completa
          (mientras tanto se ve el esqueleto de loading.tsx). Al filtrar, se atenúa lo actual. */}
      <Patrimonio ctx={ctx} />

      <ZonaFiltrada f={f}>
        <section aria-labelledby="titulo-periodo" className="mb-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 id="titulo-periodo" className="text-base font-semibold text-stone-800">Resultado del periodo</h2>
            <p className="text-xs text-stone-500">{f.etiqueta}</p>
          </div>
          <BarraFiltroInicio />
          <Actualizable><ResultadoPeriodo ctx={ctx} f={f} /></Actualizable>
        </section>

        <Graficos ctx={ctx} f={f} />
      </ZonaFiltrada>
    </>
  );
}

/** Lo que pidió el cliente: caja + mercadería = lo que tenemos, vs. capital (siempre al día de hoy) */
async function Patrimonio({ ctx }: { ctx: Contexto }) {
  const { data } = await ctx.supabase.rpc("dashboard", { p_empresa: ctx.empresa.id });
  const db = (data ?? {}) as unknown as Dashboard;
  const capital = Number(db.capital);
  const ganancia = Number(db.ganancia_acumulada);
  const porCobrar = Number(db.por_cobrar ?? 0);
  return (
    <>
      {(db.ventas_pendientes > 0 || db.selecciones_retrasadas > 0) && (
        <div className="mb-4 space-y-2">
          {db.ventas_pendientes > 0 && (
            <Aviso>
              Hay {db.ventas_pendientes} venta(s) esperando el pesaje del comprador.{" "}
              <Link href="/ventas?estado=pendiente" className="font-medium underline">Confirmar</Link>
            </Aviso>
          )}
          {db.selecciones_retrasadas > 0 && (
            <Aviso tono="rojo">
              {db.selecciones_retrasadas} compra(s) llevan más de {ctx.empresa.dias_seleccion} día(s) sin seleccionar en almacén.{" "}
              <Link href="/despacho" className="font-medium underline">Ir a Despacho</Link>
            </Aviso>
          )}
        </div>
      )}
      {/* Panel principal: la foto de HOY. Fondo de marca para que no se confunda con el resultado del periodo
          (tarjetas blancas de abajo). Colores fijos: se ve igual en modo claro y oscuro. */}
      <section aria-labelledby="titulo-patrimonio"
        className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#b5602a] via-[#a85219] to-[#6e3514] text-white shadow-lg">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
          <h2 id="titulo-patrimonio" className="text-xs font-semibold uppercase tracking-wider text-white/80">Patrimonio · hoy</h2>
          {capital > 0 && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ganancia >= 0 ? "bg-emerald-400/25 text-emerald-50" : "bg-red-400/30 text-red-50"}`}>
              {ganancia >= 0 ? "▲" : "▼"} {porcentaje(Math.abs((ganancia / capital) * 100))} sobre el capital
            </span>
          )}
        </div>
        <div className="relative grid grid-cols-2 gap-px p-2 lg:grid-cols-4">
          {[
            { t: "En caja", v: soles(db.caja), d: <Link href="/caja" className="underline-offset-2 hover:underline">Ver cajas</Link> },
            { t: "En mercadería", v: soles(Number(db.stock_costo) + Number(db.en_transito)), d: <Link href="/inventario" className="underline-offset-2 hover:underline">Stock a costo promedio</Link> },
            { t: "Total · lo que tenemos", v: soles(db.activos), d: porCobrar > 0 ? `Caja + mercadería + ${soles(porCobrar)} por cobrar` : "Caja + mercadería", fuerte: true },
            // Sin repetir la ganancia en soles (coincide con la utilidad si todo pasó en el periodo): capital y su rendimiento
            { t: "Capital aportado", v: soles(capital), d: capital > 0 ? "Aportes de los socios (sin retiros)" : "Registre los aportes en Socios" },
          ].map((k) => (
            <div key={k.t} className={`min-w-0 rounded-xl px-3 py-3 sm:px-4 ${k.fuerte ? "bg-white/15 ring-1 ring-white/25" : ""}`}>
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-white/75">{k.t}</p>
              <p className={`cifra mt-1 truncate font-bold tracking-tight ${k.fuerte ? "text-[clamp(1.2rem,5.6vw,1.9rem)]" : "text-[clamp(1.1rem,5.2vw,1.65rem)]"}`}>{k.v}</p>
              <p className="mt-0.5 truncate text-xs text-white/75">{k.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

async function ResultadoPeriodo({ ctx, f }: { ctx: Contexto; f: FiltroInicio }) {
  const { data } = await ctx.supabase.rpc("dashboard_rango", { p_empresa: ctx.empresa.id, p_desde: f.desde, p_hasta: f.hasta });
  const r = (data ?? {}) as unknown as DashboardRango;
  const filas = r.por_metal ?? [];
  const reportes = `desde=${f.desde}&hasta=${f.hasta}`;
  const merma = Number(r.merma ?? 0);
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          titulo="Utilidad del periodo"
          valor={soles(r.utilidad)}
          tono={Number(r.utilidad) >= 0 ? "positivo" : "negativo"}
          detalle={`Margen ${soles(r.margen_bruto)} · Gastos ${soles(r.gastos)}`}
        />
        <Kpi
          titulo="Ventas"
          valor={soles(r.ventas)}
          detalle={<Link href={`/ventas?${reportes}`} className="hover:underline">{r.ventas_n ?? 0} ventas · {kg(r.ventas_kg)}</Link>}
        />
        <Kpi
          titulo="Compras"
          valor={soles(r.compras)}
          detalle={<Link href={`/compras?${reportes}`} className="hover:underline">{r.compras_n ?? 0} compras · {kg(r.compras_kg)}</Link>}
        />
        {/* Merma = kilos que se pierden (humedad, tierra, diferencia de balanza), valorizados a costo.
            Si sale negativa es un sobrante (se encontró más de lo registrado). */}
        <Kpi
          titulo={merma < 0 ? "Sobrante de peso" : "Merma (pérdida de peso)"}
          valor={soles(Math.abs(merma))}
          tono={merma < 0 ? "positivo" : undefined}
          detalle={<Link href={`/reportes?r=merma&${reportes}`} className="hover:underline">Diferencias de balanza y ajustes, a costo</Link>}
        />
      </div>
      {/* Lado a lado solo en pantallas muy anchas: así la tabla no queda cortada */}
      <div className="grid gap-4 2xl:grid-cols-5">
        <Tarjeta className="2xl:col-span-3">
          <TituloTarjeta>Movimiento por metal</TituloTarjeta>
          <TablaDatos
            filas={filas}
            clave={(x) => x.nombre}
            vacio="Sin compras ni ventas en este periodo."
            columnas={[
              { titulo: "Metal", principal: true, celda: (x) => <span className="inline-flex items-center gap-2 font-medium"><PuntoMetal color={x.color} />{x.nombre}</span> },
              { titulo: "Comprado", alinear: "der", className: "cifra", celda: (x) => kg(x.kg_comprado) },
              { titulo: "Importe compra", alinear: "der", className: "cifra", ocultarMovil: true, celda: (x) => soles(x.compras) },
              { titulo: "Vendido", alinear: "der", className: "cifra", celda: (x) => kg(x.kg_vendido) },
              { titulo: "Importe venta", alinear: "der", className: "cifra", ocultarMovil: true, celda: (x) => soles(x.ventas) },
              {
                titulo: "Margen", alinear: "der", className: "cifra",
                celda: (x) => <span className={Number(x.margen) < 0 ? "text-red-700" : undefined}>{soles(x.margen)}</span>,
              },
            ]}
          />
        </Tarjeta>
        <Tarjeta className="2xl:col-span-2">
          <TituloTarjeta>Participación por metal</TituloTarjeta>
          <div className="p-4">
            <TortaPorMetal datos={filas.map((x) => ({
              nombre: x.nombre, color: x.color, compras: Number(x.compras), ventas: Number(x.ventas),
              kg_comprado: Number(x.kg_comprado), kg_vendido: Number(x.kg_vendido),
            }))} />
          </div>
        </Tarjeta>
      </div>
    </>
  );
}

/**
 * Evolución y curva S: una sola consulta de una ventana amplia (desde enero del año anterior, o antes si
 * la URL pide más) que cubre todos los atajos; los rangos se filtran en el navegador al instante.
 */
async function Graficos({ ctx, f }: { ctx: Contexto; f: FiltroInicio }) {
  const hoy = hoyLima();
  const ventanaDesde = [`${Number(hoy.slice(0, 4)) - 1}-01-01`, f.serieDesde, f.sdesde].sort()[0].slice(0, 7) + "-01";
  const [{ data }, { data: stock }] = await Promise.all([
    ctx.supabase.rpc("dashboard_serie", { p_empresa: ctx.empresa.id, p_desde: ventanaDesde, p_hasta: hoy }),
    ctx.supabase.from("v_stock_metal").select("nombre, color, kg, valor_costo")
      .eq("empresa_id", ctx.empresa.id).gt("kg", 0).order("valor_costo", { ascending: false }),
  ]);
  const serie = (data ?? { meses: [], dias: [] }) as unknown as { meses: FilaMes[]; dias: DiaSerie[] };
  // Solo lo que usan los gráficos (menos datos viajando al navegador)
  const meses = serie.meses.map((m) => ({ periodo: m.periodo, compras: Number(m.compras), ventas: Number(m.ventas), utilidad: Number(m.utilidad) }));
  const dias = serie.dias.map((d) => ({ dia: d.dia, compras: Number(d.compras), ventas: Number(d.ventas), utilidad: Number(d.utilidad) }));

  return (
    <>
      <SeccionEvolucion
        meses={meses}
        ventanaDesde={ventanaDesde}
        stock={
          <Tarjeta className="lg:col-span-2">
            <TituloTarjeta accion={<Link href="/inventario" className="text-xs font-medium text-marca-700">Inventario</Link>}>
              Stock por metal <span className="font-normal text-stone-500">· hoy</span>
            </TituloTarjeta>
            <GraficoStock datos={(stock ?? []).map((s) => ({ nombre: s.nombre, color: s.color, kg: Number(s.kg), valor: Number(s.valor_costo) }))} />
          </Tarjeta>
        }
      />
      <SeccionCurva dias={dias} ventanaDesde={ventanaDesde} />
    </>
  );
}
