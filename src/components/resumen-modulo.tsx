import type { Contexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { kg, nombrePeriodo, porcentaje, soles } from "@/lib/formato";
import { PanelModulo } from "@/components/panel-modulo";

// Panel de resumen arriba de cada módulo. Las cifras vienen de resumen_compras / resumen_ventas /
// resumen_inventario (BD); aquí solo se muestran.

type Ctx = Pick<Contexto, "supabase" | "empresa" | "rol">;
type Json = Record<string, unknown>;

const n = (v: unknown) => Number(v ?? 0);
type Top = { id?: string; nombre: string; importe?: number; kg?: number } | null;

/** "▲ 12.5 % vs mes anterior" (solo para mostrar; las cifras son de la BD) */
function variacion(actual: number, anterior: number) {
  if (anterior <= 0) return undefined;
  const pct = ((actual - anterior) / anterior) * 100;
  return `${pct >= 0 ? "▲" : "▼"} ${porcentaje(Math.abs(pct))} vs mes anterior`;
}

export async function ResumenCompras({ ctx }: { ctx: Ctx }) {
  const { data } = await ctx.supabase.rpc("resumen_compras", { p_empresa: ctx.empresa.id });
  const r = (data ?? {}) as Json;
  const prov = r.proveedor_top as Top;
  const metal = r.metal_top as Top;
  return (
    <PanelModulo
      tono="compras"
      etiqueta={`Compras · ${nombrePeriodo(String(r.periodo ?? "2000-01"))}`}
      insignia={variacion(n(r.mes_importe), n(r.anterior_importe))}
      principal={{
        titulo: "Compras del mes", valor: soles(r.mes_importe as number),
        detalle: `${n(r.mes_n)} compras${n(r.anterior_importe) > 0 ? ` · mes anterior ${soles(r.anterior_importe as number)}` : ""}`,
      }}
      celdas={[
        { titulo: "Kilos comprados", valor: kg(r.mes_kg as number), detalle: r.mes_precio_prom ? `Promedio ${soles(r.mes_precio_prom as number)}/kg` : "—" },
        { titulo: "Hoy", valor: soles(r.hoy_importe as number), detalle: `${n(r.hoy_n)} compras` },
        {
          titulo: "Proveedor del mes", valor: prov?.nombre ?? "—",
          detalle: prov ? soles(prov.importe) : metal ? `Más comprado: ${metal.nombre}` : "Sin compras con documento",
          href: prov?.id ? `/proveedores/${prov.id}` : undefined,
        },
      ]}
    />
  );
}

export async function ResumenVentas({ ctx }: { ctx: Ctx }) {
  const { data } = await ctx.supabase.rpc("resumen_ventas", { p_empresa: ctx.empresa.id });
  const r = (data ?? {}) as Json;
  const cliente = r.cliente_top as Top;
  const verMargen = puede(ctx.rol, "verCostos");
  return (
    <PanelModulo
      tono="ventas"
      etiqueta={`Ventas · ${nombrePeriodo(String(r.periodo ?? "2000-01"))}`}
      insignia={verMargen && r.mes_margen_pct != null ? `Margen ${porcentaje(r.mes_margen_pct as number)}` : undefined}
      principal={{
        titulo: "Ventas del mes", valor: soles(r.mes_importe as number),
        detalle: `${n(r.mes_n)} confirmadas · ${kg(r.mes_kg as number)}`,
      }}
      celdas={[
        verMargen
          ? { titulo: "Margen del mes", valor: soles(r.mes_margen as number), negativo: n(r.mes_margen) < 0, detalle: "Venta − costo de lo vendido" }
          : { titulo: "Merma del mes", valor: kg(r.mes_merma_kg as number), detalle: "Diferencia de balanza" },
        {
          titulo: "Por pesar", valor: n(r.pendientes_n), detalle: `${kg(r.pendientes_kg as number)} en tránsito`,
          href: n(r.pendientes_n) > 0 ? "/ventas?estado=pendiente" : undefined,
        },
        {
          titulo: "Cliente del mes", valor: cliente?.nombre ?? "—",
          detalle: cliente ? soles(cliente.importe) : "Sin ventas confirmadas",
          href: cliente?.id ? `/compradores/${cliente.id}` : undefined,
        },
      ]}
    />
  );
}

export async function ResumenInventario({ ctx }: { ctx: Ctx }) {
  const { data } = await ctx.supabase.rpc("resumen_inventario", { p_empresa: ctx.empresa.id });
  const r = (data ?? {}) as Json;
  const kilos = { titulo: "Kilos en stock", valor: kg(r.kg as number), detalle: `${n(r.metales_con_stock)} metales con stock` };
  if (!puede(ctx.rol, "verCostos")) return <PanelModulo tono="inventario" etiqueta="Inventario · hoy" principal={kilos} celdas={[]} />;
  return (
    <PanelModulo
      tono="inventario"
      etiqueta="Inventario · hoy"
      principal={{ titulo: "Valor a costo", valor: soles(r.valor_costo as number), detalle: "Lo que nos costó el stock (costo promedio ponderado)" }}
      celdas={[
        kilos,
        { titulo: "Valor a precio de hoy", valor: soles(r.valor_venta as number), detalle: "Con el precio de venta del día" },
        {
          titulo: "Ganancia si vendemos hoy", valor: soles(r.ganancia_potencial as number), negativo: n(r.ganancia_potencial) < 0,
          detalle: n(r.en_transito) > 0 ? `+ ${soles(r.en_transito as number)} en tránsito` : "Precio de venta − costo",
        },
      ]}
    />
  );
}
