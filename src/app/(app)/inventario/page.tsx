import type { Metadata } from "next";
import Link from "next/link";
import { Clock, FileSpreadsheet, FileText, History } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fecha, fechaHora, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, PuntoMetal, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { EnlaceDescarga } from "@/components/ui/enlace-descarga";
import { TablaDatos } from "@/components/ui/tabla";
import { Pestanas } from "@/components/ui/pestanas";
import { ResumenInventario } from "@/components/resumen-modulo";
import { AccionesInventario } from "./acciones-inventario";

export const metadata: Metadata = { title: "Inventario" };

const claseBotonBorde = "inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-superficie px-4 text-sm font-medium hover:bg-stone-50";

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ tab?: string; metal?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "stock";
  const ctx = await exigir("verTodo", "vender");
  const { supabase, empresa, rol } = ctx;
  const verCostos = puede(rol, "verCostos");

  let qLotes = supabase.from("v_lotes").select("*").eq("empresa_id", empresa.id)
    .or("kg_en_stock.gt.0,por_seleccionar.eq.true").order("fecha", { ascending: true }).limit(300);
  if (sp.metal) qLotes = qLotes.eq("metal_id", sp.metal);
  const [{ data: stock }, { data: ajustes }, { data: lotes }] = await Promise.all([
    supabase.from("v_stock_arbol").select("*").eq("empresa_id", empresa.id).order("clave_orden"),
    supabase.from("v_ajustes").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(20),
    qLotes,
  ]);
  // Cada nivel de la jerarquía suma lo propio y lo de sus variantes (v_stock_arbol)
  const filas = (stock ?? []).filter((s) => s.activo || Number(s.kg) !== 0);
  const dias = (f: string | null) => (f ? Math.floor((Date.now() - new Date(f).getTime()) / 86400_000) : null);
  const retrasados = (lotes ?? []).filter((l) => l.retrasado).length;

  return (
    <>
      <Encabezado
        titulo="Inventario"
        descripcion="Kilos por producto en cada nivel (familia, producto, variante), cuándo llegó y su valor a costo promedio y al precio del día"
        acciones={
          <>
            {verCostos && (
              <>
                <a href="/inventario/valorizado?formato=pdf" target="_blank" className={claseBotonBorde}><FileText className="size-4" /> Valorizado PDF</a>
                <EnlaceDescarga href="/inventario/valorizado?formato=xlsx" className={claseBotonBorde}><FileSpreadsheet className="size-4" /> Excel</EnlaceDescarga>
              </>
            )}
            {puede(rol, "ajustarInventario") && (
              <AccionesInventario metales={filas.map((f) => ({ id: f.metal_id, nombre: f.ruta, kg: f.kg_propio }))} />
            )}
          </>
        }
      />

      <ResumenInventario ctx={ctx} />

      <Pestanas
        base="/inventario"
        actual={tab}
        opciones={[
          { valor: "stock", texto: "Stock por producto" },
          { valor: "llegadas", texto: "Llegadas y antigüedad", cantidad: retrasados || undefined },
          { valor: "ajustes", texto: "Ajustes" },
        ]}
      />

      {tab === "stock" && (
        <Tarjeta>
          <TablaDatos
            filas={filas}
            clave={(s) => s.metal_id}
            enlace={(s) => `/inventario/${s.metal_id}`}
            vacio="Sin productos."
            columnas={[
              {
                titulo: "Producto", principal: true,
                celda: (s) => (
                  <span className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${(s.nivel - 1) * 1.1}rem` }}>
                    {s.nivel > 1 && <span className="text-stone-300">└</span>}
                    <PuntoMetal color={s.color} />
                    <span className={s.nivel === 1 ? "font-semibold" : ""}>{s.nombre}</span>
                    {s.codigo && <span className="font-mono text-xs text-stone-500">{s.codigo}</span>}
                    {!s.activo && <Insignia>Inactivo</Insignia>}
                  </span>
                ),
              },
              {
                titulo: "Stock", alinear: "der", principal: true,
                celda: (s) => (
                  <span className="cifra">
                    <b className="font-semibold">{kg(s.kg)}</b>
                    {s.tiene_hijos && Number(s.kg_propio) !== Number(s.kg) && <span className="block text-xs text-stone-500">propio {kg(s.kg_propio)}</span>}
                  </span>
                ),
              },
              {
                titulo: "Llegada más antigua", ocultarMovil: true,
                celda: (s) => s.llegada_antigua ? <span className="text-sm">{fecha(s.llegada_antigua)} <span className="text-stone-500">· {dias(s.llegada_antigua)} día(s)</span></span> : "—",
              },
              {
                titulo: "Por limpiar", alinear: "der",
                celda: (s) => Number(s.kg_por_limpiar) > 0
                  ? <span className={`cifra ${s.retrasado ? "font-medium text-red-700" : "text-amber-700"}`}>{kg(s.kg_por_limpiar)}{s.retrasado && " ⚠"}</span>
                  : <span className="text-stone-400">—</span>,
              },
              ...(verCostos ? [
                { titulo: "Costo prom./kg", alinear: "der" as const, celda: (s: (typeof filas)[number]) => <span className="cifra">{s.costo_promedio ? soles(s.costo_promedio) : "—"}</span> },
                { titulo: "Valor a costo", alinear: "der" as const, celda: (s: (typeof filas)[number]) => <span className="cifra">{soles(s.valor_costo)}</span> },
              ] : []),
              { titulo: "Precio venta", alinear: "der", celda: (s) => <span className="cifra">{soles(s.precio_venta)}</span> },
              { titulo: "Valor a venta", alinear: "der", celda: (s) => <span className="cifra">{soles(s.valor_venta)}</span> },
              {
                titulo: "", alinear: "der", ocultarMovil: true,
                celda: () => <span className="inline-flex items-center gap-1 text-xs font-medium text-marca-700"><History className="size-3.5" />Historial</span>,
              },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "llegadas" && (
        <Tarjeta>
          <TituloTarjeta accion={
            <form method="get" className="flex items-center gap-2">
              <input type="hidden" name="tab" value="llegadas" />
              <select name="metal" defaultValue={sp.metal ?? ""} className="rounded-md border border-stone-300 bg-superficie px-2 py-1 text-xs">
                <option value="">Todos los productos</option>
                {filas.map((f) => <option key={f.metal_id} value={f.metal_id}>{f.ruta}</option>)}
              </select>
              <button className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium">Filtrar</button>
            </form>
          }>
            Material en almacén por fecha de llegada
          </TituloTarjeta>
          <TablaDatos
            filas={lotes ?? []}
            clave={(l) => l.compra_item_id}
            enlace={(l) => `/compras/${l.compra_id}`}
            vacio="No hay material en almacén."
            columnas={[
              { titulo: "Llegó", principal: true, celda: (l) => fechaHora(l.fecha) },
              {
                titulo: "Días", alinear: "der",
                celda: (l) => <span className={`cifra ${l.dias > 30 ? "font-medium text-amber-700" : ""}`}>{l.dias}</span>,
              },
              { titulo: "Producto", celda: (l) => <span className="flex items-center gap-2"><PuntoMetal color={l.metal_color} />{l.metal_nombre}{l.es_traslado && <Insignia tono="azul">Separado</Insignia>}</span> },
              { titulo: "Compra", celda: (l) => `N° ${l.numero}` },
              { titulo: "Proveedor", ocultarMovil: true, celda: (l) => l.proveedor_nombre ?? "Sin documento" },
              { titulo: "Ingresó", alinear: "der", className: "cifra", celda: (l) => kg(l.kg_ingresado) },
              { titulo: "Merma", alinear: "der", ocultarMovil: true, celda: (l) => Number(l.kg_descuento) ? <span className="cifra text-amber-700">{kg(l.kg_descuento)}</span> : "—" },
              { titulo: "En stock (est.)", alinear: "der", principal: true, celda: (l) => <span className="cifra font-semibold">{kg(l.kg_en_stock)}</span> },
              {
                titulo: "Limpieza",
                celda: (l) => l.retrasado ? <Insignia tono="rojo"><Clock className="mr-1 size-3" />Retrasada</Insignia>
                  : l.por_seleccionar ? <Insignia tono="ambar">Por limpiar</Insignia>
                  : Number(l.kg_descuento) > 0 || Number(l.kg_traslado) > 0 ? <Insignia tono="azul">Limpiado</Insignia>
                  : <Insignia tono="verde">Conforme</Insignia>,
              },
            ]}
          />
          <p className="border-t border-stone-100 px-4 py-3 text-xs text-stone-500">
            «En stock» es un estimado: se asume que sale primero lo que llegó antes. El valor oficial del stock es a costo promedio.
            Las compras retrasadas se limpian en <Link href="/limpieza" className="font-medium text-marca-700 hover:underline">Limpieza</Link>
            {" "}(plazo: {empresa.dias_seleccion} día(s)).
          </p>
        </Tarjeta>
      )}

      {tab === "ajustes" && (
        <Tarjeta>
          <TituloTarjeta>Últimos ajustes</TituloTarjeta>
          <TablaDatos
            filas={ajustes ?? []}
            clave={(a) => a.id}
            vacio="Sin ajustes registrados."
            columnas={[
              { titulo: "Fecha", celda: (a) => fechaHora(a.fecha) },
              { titulo: "Producto", principal: true, celda: (a) => a.metal_nombre },
              { titulo: "Tipo", celda: (a) => <Insignia tono={a.tipo === "reclasificacion" ? "azul" : "ambar"}>{a.tipo === "reclasificacion" ? "Reclasificación" : a.tipo === "conteo" ? "Conteo" : a.tipo === "merma" ? "Merma" : "Otro"}</Insignia> },
              { titulo: "Kg", alinear: "der", principal: true, celda: (a) => <span className={`cifra ${Number(a.kg) < 0 ? "text-red-700" : "text-emerald-700"}`}>{Number(a.kg) > 0 ? "+" : ""}{kg(a.kg)}</span> },
              ...(verCostos ? [{ titulo: "Costo", alinear: "der" as const, celda: (a: NonNullable<typeof ajustes>[number]) => <span className="cifra">{soles(a.costo_total)}</span> }] : []),
              { titulo: "Motivo", celda: (a) => a.motivo },
            ]}
          />
        </Tarjeta>
      )}
    </>
  );
}
