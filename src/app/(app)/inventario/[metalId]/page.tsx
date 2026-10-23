import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fecha, fechaHora, hoyLima, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, Kpi, PuntoMetal, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { EnlaceDescarga } from "@/components/ui/enlace-descarga";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros } from "@/components/filtros";
import { GraficoHistorialMetal, type FilaMetalMes } from "@/components/graficos-dashboard";

export const metadata: Metadata = { title: "Historial del producto" };

interface Resumen {
  compras_n: number; kg_comprado: number; compras: number; precio_prom_compra: number | null;
  primera_compra: string | null; ultima_compra: string | null;
  ventas_n: number; kg_vendido: number; ventas: number; precio_prom_venta: number | null; margen: number;
  merma_kg: number; ultima_venta: string | null; descuento_kg: number; descuento_importe: number;
  por_mes: FilaMetalMes[];
}

/** Rango por defecto: los últimos 12 meses */
function rangoPorDefecto() {
  const hoy = hoyLima();
  const [a, m] = hoy.split("-").map(Number);
  const desde = new Date(Date.UTC(a, m - 12, 1)).toISOString().slice(0, 10);
  return { desde, hasta: hoy };
}

export default async function HistorialMetal({
  params, searchParams,
}: { params: Promise<{ metalId: string }>; searchParams: Promise<{ desde?: string; hasta?: string; tab?: string }> }) {
  const { metalId } = await params;
  const sp = await searchParams;
  const tab = sp.tab ?? "compras";
  const { supabase, rol } = await exigir("verTodo", "vender");
  const verCostos = puede(rol, "verCostos");
  const def = rangoPorDefecto();
  const desde = sp.desde && /^\d{4}-\d{2}-\d{2}$/.test(sp.desde) ? sp.desde : def.desde;
  const hasta = sp.hasta && /^\d{4}-\d{2}-\d{2}$/.test(sp.hasta) ? sp.hasta : def.hasta;
  const iniTs = `${desde}T00:00:00-05:00`;
  const finTs = `${hasta}T23:59:59.999-05:00`;

  const [{ data: s }, { data: r }, compras, ventas, movs] = await Promise.all([
    supabase.from("v_stock_metal").select("*").eq("metal_id", metalId).maybeSingle(),
    supabase.rpc("resumen_metal", { p_metal: metalId, p_desde: desde, p_hasta: hasta }),
    tab === "compras"
      ? supabase.from("v_compra_items").select("id, compra_id, numero, fecha, estado, proveedor_id, proveedor_nombre, peso_neto_kg, precio_kg, importe")
          .eq("metal_id", metalId).gte("dia", desde).lte("dia", hasta).order("fecha", { ascending: false }).limit(300)
      : null,
    tab === "ventas"
      ? supabase.from("v_venta_items").select("id, venta_id, numero, fecha, fecha_confirmacion, estado, comprador_id, comprador_nombre, peso_salida_kg, peso_recibido_kg, merma_kg, precio_kg, importe, costo_kg")
          .eq("metal_id", metalId).gte("dia", desde).lte("dia", hasta).order("fecha", { ascending: false }).limit(300)
      : null,
    tab === "movimientos"
      ? supabase.from("v_kardex").select("*").eq("metal_id", metalId).gte("fecha", iniTs).lte("fecha", finTs)
          .order("fecha", { ascending: false }).order("creado_en", { ascending: false }).limit(300)
      : null,
  ]);
  if (!s) notFound();
  const res = (r ?? {}) as unknown as Resumen;
  const qs = new URLSearchParams({ metal: metalId, desde, hasta });
  const base = `/inventario/${metalId}`;
  const conRango = (t: string) => `${base}?tab=${t}&desde=${desde}&hasta=${hasta}`;

  const tipo = (t: string) => t === "compra" ? <Insignia tono="verde">Compra</Insignia>
    : t === "venta" ? <Insignia tono="azul">Venta</Insignia>
    : t === "descuento" ? <Insignia tono="ambar">Descuento</Insignia>
    : <Insignia tono="ambar">Ajuste</Insignia>;

  return (
    <>
      <Link href="/inventario" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Inventario
      </Link>
      <Encabezado
        titulo={`Historial · ${s.ruta ?? s.nombre}`}
        descripcion={<span className="inline-flex items-center gap-2"><PuntoMetal color={s.color} />Cuándo se compró, a quién, cuándo se vendió y a qué precio</span>}
        acciones={puede(rol, "verReportes") && (
          <EnlaceDescarga href={`/reportes/exportar/kardex?${qs}&formato=xlsx`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-superficie px-4 text-sm font-medium hover:bg-stone-50">
            <Download className="size-4" /> Kardex Excel
          </EnlaceDescarga>
        )}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Stock hoy" valor={kg(s.kg)} detalle={verCostos && s.costo_promedio ? `Costo promedio ${soles(s.costo_promedio)}/kg` : `Precio venta ${soles(s.precio_venta)}/kg`} />
        <Kpi titulo="Comprado" valor={kg(res.kg_comprado)}
          detalle={`${res.compras_n ?? 0} compras${res.precio_prom_compra ? ` · prom. ${soles(res.precio_prom_compra)}/kg` : ""}`} />
        <Kpi titulo="Vendido" valor={kg(res.kg_vendido)}
          detalle={`${res.ventas_n ?? 0} ventas${res.precio_prom_venta ? ` · prom. ${soles(res.precio_prom_venta)}/kg` : ""}`} />
        {verCostos
          ? <Kpi titulo="Margen" valor={soles(res.margen)} tono={Number(res.margen) >= 0 ? "positivo" : "negativo"} detalle={`Ventas ${soles(res.ventas)}`} />
          : <Kpi titulo="Descontado en selección" valor={kg(res.descuento_kg)} />}
      </div>

      <Filtros valores={{ desde, hasta }} ocultos={{ tab }} />

      <Tarjeta className="mb-4">
        <TituloTarjeta>Kilos por mes y precio promedio</TituloTarjeta>
        <div className="p-4">
          <GraficoHistorialMetal datos={res.por_mes ?? []} />
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            <span>Primera compra: {fecha(res.primera_compra)}</span>
            <span>Última compra: {fecha(res.ultima_compra)}</span>
            <span>Última venta: {fecha(res.ultima_venta)}</span>
            {Number(res.descuento_kg) > 0 && <span>Descontado en selección: {kg(res.descuento_kg)}{verCostos && ` (${soles(res.descuento_importe)})`}</span>}
            {Number(res.merma_kg) !== 0 && <span>Diferencia de balanza en ventas: {kg(res.merma_kg)}</span>}
          </p>
        </div>
      </Tarjeta>

      {/* Pestañas a mano (no Pestanas) para conservar el rango de fechas al cambiar */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-stone-200/60 p-1">
        {[
          { t: "compras", texto: `Compras (${res.compras_n ?? 0})` },
          { t: "ventas", texto: `Ventas (${res.ventas_n ?? 0})` },
          { t: "movimientos", texto: "Movimientos (kardex)" },
        ].map((o) => (
          <Link key={o.t} href={conRango(o.t)} scroll={false}
            className={`flex flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${tab === o.t ? "bg-superficie text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}>
            {o.texto}
          </Link>
        ))}
      </div>

      {tab === "compras" && (
        <Tarjeta>
          <TablaDatos
            filas={compras?.data ?? []}
            clave={(c) => c.id}
            enlace={(c) => `/compras/${c.compra_id}`}
            vacio="Sin compras de este producto en el periodo."
            columnas={[
              { titulo: "Fecha", principal: true, celda: (c) => fechaHora(c.fecha) },
              { titulo: "Compra", celda: (c) => <span className="flex items-center gap-1">N° {c.numero}{c.estado === "anulada" && <Insignia tono="rojo">Anulada</Insignia>}</span> },
              { titulo: "Proveedor", celda: (c) => c.proveedor_nombre ?? "Sin documento" },
              { titulo: "Kg", alinear: "der", principal: true, className: "cifra", celda: (c) => kg(c.peso_neto_kg) },
              { titulo: "Precio/kg", alinear: "der", className: "cifra", celda: (c) => soles(c.precio_kg) },
              { titulo: "Importe", alinear: "der", className: "cifra", celda: (c) => <span className={c.estado === "anulada" ? "text-stone-400 line-through" : "font-medium"}>{soles(c.importe)}</span> },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "ventas" && (
        <Tarjeta>
          <TablaDatos
            filas={ventas?.data ?? []}
            clave={(v) => v.id}
            enlace={(v) => `/ventas/${v.venta_id}`}
            vacio="Sin ventas de este producto en el periodo."
            columnas={[
              { titulo: "Fecha", principal: true, celda: (v) => fechaHora(v.fecha_confirmacion ?? v.fecha) },
              { titulo: "Venta", celda: (v) => <span className="flex items-center gap-1">N° {v.numero}{v.estado !== "confirmada" && <Insignia tono={v.estado === "anulada" ? "rojo" : "ambar"}>{v.estado === "anulada" ? "Anulada" : "Por pesar"}</Insignia>}</span> },
              { titulo: "Cliente", celda: (v) => v.comprador_nombre },
              { titulo: "Salió", alinear: "der", className: "cifra", celda: (v) => kg(v.peso_salida_kg) },
              { titulo: "Recibido", alinear: "der", principal: true, className: "cifra", celda: (v) => v.peso_recibido_kg === null ? "—" : kg(v.peso_recibido_kg) },
              { titulo: "Precio/kg", alinear: "der", className: "cifra", celda: (v) => v.precio_kg === null ? "—" : soles(v.precio_kg) },
              ...(verCostos ? [{ titulo: "Costo/kg", alinear: "der" as const, className: "cifra", celda: (v: NonNullable<NonNullable<typeof ventas>["data"]>[number]) => soles(v.costo_kg) }] : []),
              { titulo: "Importe", alinear: "der", className: "cifra", celda: (v) => v.importe === null ? "—" : soles(v.importe) },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "movimientos" && (
        <Tarjeta>
          <TablaDatos
            filas={movs?.data ?? []}
            clave={(m) => m.id}
            vacio="Sin movimientos en el periodo."
            columnas={[
              { titulo: "Fecha", principal: true, celda: (m) => fechaHora(m.fecha) },
              { titulo: "Tipo", celda: (m) => <span className="flex items-center gap-1">{tipo(m.tipo)}{m.anulado && <Insignia tono="rojo">Anulado</Insignia>}</span> },
              {
                titulo: "Detalle",
                celda: (m) => m.origen_tabla === "compras" ? <Link className="text-marca-700 hover:underline" href={`/compras/${m.origen_id}`}>{m.detalle}</Link>
                  : m.origen_tabla === "ventas" ? <Link className="text-marca-700 hover:underline" href={`/ventas/${m.origen_id}`}>{m.detalle}</Link>
                  : m.detalle,
              },
              { titulo: "Kg", alinear: "der", principal: true, celda: (m) => <span className={`cifra ${m.anulado ? "text-stone-400 line-through" : Number(m.kg) < 0 ? "text-red-700" : "text-emerald-700"}`}>{Number(m.kg) > 0 ? "+" : ""}{kg(m.kg)}</span> },
              ...(verCostos ? [
                { titulo: "Costo/kg", alinear: "der" as const, celda: (m: NonNullable<NonNullable<typeof movs>["data"]>[number]) => <span className="cifra">{m.costo_kg ? soles(m.costo_kg) : "—"}</span> },
                { titulo: "Costo", alinear: "der" as const, celda: (m: NonNullable<NonNullable<typeof movs>["data"]>[number]) => <span className="cifra">{soles(m.costo_total)}</span> },
              ] : []),
              { titulo: "Saldo kg", alinear: "der", celda: (m) => <span className="cifra font-medium">{kg(m.saldo_kg)}</span> },
              ...(verCostos ? [{ titulo: "Saldo S/", alinear: "der" as const, celda: (m: NonNullable<NonNullable<typeof movs>["data"]>[number]) => <span className="cifra">{soles(m.saldo_costo)}</span> }] : []),
            ]}
          />
        </Tarjeta>
      )}
    </>
  );
}
