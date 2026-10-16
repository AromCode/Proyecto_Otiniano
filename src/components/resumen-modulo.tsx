import Link from "next/link";
import type { Contexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { kg, nombrePeriodo, porcentaje, soles } from "@/lib/formato";
import { Tarjeta } from "@/components/ui/basicos";
import { cx } from "@/components/ui/clases";
import { TONOS, type Tono } from "@/components/shell/modulos";

// Tarjetas de resumen arriba de cada módulo. Las cifras vienen de resumen_compras / resumen_ventas /
// resumen_inventario (BD); aquí solo se muestran.

type Ctx = Pick<Contexto, "supabase" | "empresa" | "rol">;
type Json = Record<string, unknown>;

function Indicador({ tono, titulo, valor, detalle, href }: {
  tono: Tono; titulo: string; valor: React.ReactNode; detalle?: React.ReactNode; href?: string;
}) {
  const contenido = (
    <Tarjeta className={cx("h-full border-l-4 p-3.5 sm:p-4", TONOS[tono].barra, href && "transition hover:shadow-md")}>
      <p className="truncate text-xs font-medium uppercase tracking-wide text-stone-500">{titulo}</p>
      <p className="cifra mt-1 truncate text-[clamp(1.05rem,5.2vw,1.5rem)] font-semibold">{valor}</p>
      {detalle && <p className="mt-0.5 truncate text-xs text-stone-500">{detalle}</p>}
    </Tarjeta>
  );
  return href ? <Link href={href} className="block min-w-0">{contenido}</Link> : <div className="min-w-0">{contenido}</div>;
}

const rejilla = "mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4";
const n = (v: unknown) => Number(v ?? 0);
type Top = { id?: string; nombre: string; importe?: number; kg?: number } | null;

export async function ResumenCompras({ ctx }: { ctx: Ctx }) {
  const { data } = await ctx.supabase.rpc("resumen_compras", { p_empresa: ctx.empresa.id });
  const r = (data ?? {}) as Json;
  const mes = nombrePeriodo(String(r.periodo ?? "2000-01"));
  const prov = r.proveedor_top as Top;
  const metal = r.metal_top as Top;
  return (
    <div className={rejilla}>
      <Indicador tono="teal" titulo="Compras del mes" valor={soles(r.mes_importe as number)}
        detalle={`${mes} · ${n(r.mes_n)} compras · mes anterior ${soles(r.anterior_importe as number)}`} />
      <Indicador tono="teal" titulo="Kilos comprados" valor={kg(r.mes_kg as number)}
        detalle={r.mes_precio_prom ? `Promedio ${soles(r.mes_precio_prom as number)}/kg` : "—"} />
      <Indicador tono="teal" titulo="Hoy" valor={soles(r.hoy_importe as number)} detalle={`${n(r.hoy_n)} compras`} />
      <Indicador tono="teal" titulo="Proveedor del mes" valor={prov?.nombre ?? "—"}
        detalle={prov ? soles(prov.importe) : metal ? `Más comprado: ${metal.nombre}` : "Sin compras con documento"}
        href={prov?.id ? `/proveedores/${prov.id}` : undefined} />
    </div>
  );
}

export async function ResumenVentas({ ctx }: { ctx: Ctx }) {
  const { data } = await ctx.supabase.rpc("resumen_ventas", { p_empresa: ctx.empresa.id });
  const r = (data ?? {}) as Json;
  const mes = nombrePeriodo(String(r.periodo ?? "2000-01"));
  const cliente = r.cliente_top as Top;
  const verMargen = puede(ctx.rol, "verTodo");
  return (
    <div className={rejilla}>
      <Indicador tono="indigo" titulo="Ventas del mes" valor={soles(r.mes_importe as number)}
        detalle={`${mes} · ${n(r.mes_n)} confirmadas · ${kg(r.mes_kg as number)}`} />
      {verMargen ? (
        <Indicador tono="indigo" titulo="Margen del mes" valor={soles(r.mes_margen as number)}
          detalle={r.mes_margen_pct != null ? `${porcentaje(r.mes_margen_pct as number)} sobre ventas` : "—"} />
      ) : (
        <Indicador tono="indigo" titulo="Merma del mes" valor={kg(r.mes_merma_kg as number)} detalle="Diferencia de balanza" />
      )}
      <Indicador tono="indigo" titulo="Por pesar" valor={n(r.pendientes_n)}
        detalle={`${kg(r.pendientes_kg as number)} en tránsito`} href={n(r.pendientes_n) > 0 ? "/ventas?estado=pendiente" : undefined} />
      <Indicador tono="indigo" titulo="Cliente del mes" valor={cliente?.nombre ?? "—"}
        detalle={cliente ? soles(cliente.importe) : "Sin ventas confirmadas"}
        href={cliente?.id ? `/compradores/${cliente.id}` : undefined} />
    </div>
  );
}

export async function ResumenInventario({ ctx }: { ctx: Ctx }) {
  const { data } = await ctx.supabase.rpc("resumen_inventario", { p_empresa: ctx.empresa.id });
  const r = (data ?? {}) as Json;
  const verCostos = puede(ctx.rol, "verTodo");
  return (
    <div className={rejilla}>
      <Indicador tono="violet" titulo="Kilos en stock" valor={kg(r.kg as number)} detalle={`${n(r.metales_con_stock)} metales con stock`} />
      {verCostos && <Indicador tono="violet" titulo="Valor a costo" valor={soles(r.valor_costo as number)} detalle="Costo promedio ponderado" />}
      {verCostos && <Indicador tono="violet" titulo="Valor a precio de hoy" valor={soles(r.valor_venta as number)} detalle="Con el precio de venta del día" />}
      {verCostos && (
        <Indicador tono="violet" titulo="Ganancia si vendemos hoy" valor={soles(r.ganancia_potencial as number)}
          detalle={n(r.en_transito) > 0 ? `+ ${soles(r.en_transito as number)} en tránsito` : "Precio de venta − costo"} />
      )}
    </div>
  );
}
