import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fechaHora, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, Kpi, Tarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros, rangoLima } from "@/components/filtros";

export const metadata: Metadata = { title: "Kardex" };

export default async function KardexPage({
  params, searchParams,
}: { params: Promise<{ metalId: string }>; searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const { metalId } = await params;
  const sp = await searchParams;
  const { supabase, rol } = await exigir("verTodo", "vender");
  const verCostos = puede(rol, "verTodo");
  const { desde, hasta } = rangoLima(sp.desde, sp.hasta);

  const { data: s } = await supabase.from("v_stock_metal").select("*").eq("metal_id", metalId).maybeSingle();
  if (!s) notFound();

  let q = supabase.from("v_kardex").select("*").eq("metal_id", metalId).order("fecha", { ascending: false }).order("creado_en", { ascending: false }).limit(300);
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lt("fecha", hasta);
  const { data: movs } = await q;

  const tipo = (t: string) => t === "compra" ? <Insignia tono="verde">Compra</Insignia> : t === "venta" ? <Insignia tono="azul">Venta</Insignia> : <Insignia tono="ambar">Ajuste</Insignia>;
  const qs = new URLSearchParams({ metal: metalId, ...(sp.desde ? { desde: sp.desde } : {}), ...(sp.hasta ? { hasta: sp.hasta } : {}) });

  return (
    <>
      <Link href="/inventario" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Inventario
      </Link>
      <Encabezado
        titulo={`Kardex · ${s.nombre}`}
        acciones={puede(rol, "verReportes") && (
          <a href={`/reportes/exportar/kardex?${qs}&formato=xlsx`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50">
            <Download className="size-4" /> Excel
          </a>
        )}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Stock" valor={kg(s.kg)} />
        {verCostos && <Kpi titulo="Costo promedio" valor={s.costo_promedio ? soles(s.costo_promedio) : "—"} detalle="por kg" />}
        {verCostos && <Kpi titulo="Valor a costo" valor={soles(s.valor_costo)} />}
        <Kpi titulo="Valor a precio de venta" valor={soles(s.valor_venta)} />
      </div>
      <Filtros valores={sp} />
      <Tarjeta>
        <TablaDatos
          filas={movs ?? []}
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
              { titulo: "Costo/kg", alinear: "der" as const, celda: (m: NonNullable<typeof movs>[number]) => <span className="cifra">{m.costo_kg ? soles(m.costo_kg) : "—"}</span> },
              { titulo: "Costo", alinear: "der" as const, celda: (m: NonNullable<typeof movs>[number]) => <span className="cifra">{soles(m.costo_total)}</span> },
            ] : []),
            { titulo: "Saldo kg", alinear: "der", celda: (m) => <span className="cifra font-medium">{kg(m.saldo_kg)}</span> },
            ...(verCostos ? [{ titulo: "Saldo S/", alinear: "der" as const, celda: (m: NonNullable<typeof movs>[number]) => <span className="cifra">{soles(m.saldo_costo)}</span> }] : []),
          ]}
        />
      </Tarjeta>
    </>
  );
}
