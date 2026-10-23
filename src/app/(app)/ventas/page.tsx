import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fechaHora, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta, type Tono } from "@/components/ui/basicos";
import { BotonLink } from "@/components/ui/boton";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros, rangoLima } from "@/components/filtros";
import { ResumenVentas } from "@/components/resumen-modulo";
import { TituloSeccion } from "@/components/panel-modulo";

export const metadata: Metadata = { title: "Ventas" };

const ESTADO: Record<string, [string, Tono]> = {
  pendiente: ["Pendiente de pesaje", "ambar"],
  confirmada: ["Confirmada", "verde"],
  anulada: ["Anulada", "rojo"],
};

type Params = { desde?: string; hasta?: string; estado?: string; comprador?: string; metal?: string };

export default async function VentasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const ctx = await exigir("verTodo", "vender");
  const { supabase, empresa, rol } = ctx;
  const { desde, hasta } = rangoLima(sp.desde, sp.hasta);

  let q = supabase.from("v_ventas").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(200);
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lt("fecha", hasta);
  if (sp.estado) q = q.eq("estado", sp.estado);
  if (sp.comprador) q = q.eq("comprador_id", sp.comprador);
  if (sp.metal) q = q.contains("metal_ids", [sp.metal]);

  const [{ data: ventas }, { data: compradores }, { data: metales }] = await Promise.all([
    q,
    supabase.from("compradores").select("id, razon_social").eq("empresa_id", empresa.id).order("razon_social"),
    supabase.from("v_productos").select("id, nombre:ruta").eq("empresa_id", empresa.id).order("clave_orden"),
  ]);
  const filas = ventas ?? [];

  return (
    <>
      <Encabezado
        titulo="Ventas"
        descripcion="Salida de nuestra balanza → confirmación del pesaje del comprador"
        acciones={puede(rol, "vender") && <BotonLink href="/vender"><Plus className="size-4" /> Nueva venta</BotonLink>}
      />
      <ResumenVentas ctx={ctx} />
      <TituloSeccion titulo="Historial de ventas" detalle={`${filas.length} ventas con estos filtros`} />
      <Filtros
        valores={sp}
        selects={[
          { nombre: "comprador", etiqueta: "Comprador", opciones: (compradores ?? []).map((c) => ({ valor: c.id, texto: c.razon_social })) },
          { nombre: "metal", etiqueta: "Producto", opciones: (metales ?? []).map((m) => ({ valor: m.id, texto: m.nombre })) },
          { nombre: "estado", etiqueta: "Estado", opciones: Object.entries(ESTADO).map(([v, [t]]) => ({ valor: v, texto: t })) },
        ]}
      />
      <Tarjeta>
        <TablaDatos
          filas={filas}
          clave={(v) => v.id}
          enlace={(v) => `/ventas/${v.id}`}
          vacio="No hay ventas con esos filtros."
          columnas={[
            { titulo: "N°", principal: true, celda: (v) => <span className="cifra">#{v.numero}</span> },
            { titulo: "Fecha", celda: (v) => fechaHora(v.fecha) },
            { titulo: "Comprador", celda: (v) => v.comprador_nombre },
            { titulo: "Productos", celda: (v) => v.metales, ocultarMovil: true },
            { titulo: "Salida", alinear: "der", celda: (v) => <span className="cifra">{kg(v.kg_salida)}</span> },
            { titulo: "Merma", alinear: "der", celda: (v) => v.merma_kg === null ? "—" : <span className="cifra">{kg(v.merma_kg)}</span> },
            { titulo: "S/ por kg", alinear: "der", ocultarMovil: true, celda: (v) => <span className="cifra text-stone-600">{v.precio_promedio ? soles(v.precio_promedio) : "—"}</span> },
            { titulo: "Total", alinear: "der", principal: true, celda: (v) => <span className={v.estado === "anulada" ? "cifra text-stone-400 line-through" : "cifra font-semibold"}>{soles(v.total)}</span> },
            { titulo: "Estado", celda: (v) => <Insignia tono={ESTADO[v.estado][1]}>{ESTADO[v.estado][0]}</Insignia> },
          ]}
        />
      </Tarjeta>
    </>
  );
}
