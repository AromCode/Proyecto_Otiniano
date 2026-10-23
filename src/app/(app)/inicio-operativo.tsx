import Link from "next/link";
import { ChevronRight, ClipboardList, Scale, Tag, Truck, Wallet } from "lucide-react";
import type { Contexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fechaHora, hoyLima, kg, soles } from "@/lib/formato";
import { rangoLima } from "@/components/filtros";
import { Aviso, Kpi, PuntoMetal, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { cx } from "@/components/ui/clases";
import { TONOS, type Tono } from "@/components/shell/modulos";

interface Hoy {
  caja: number; hoy_compras_n: number; hoy_compras_kg: number; hoy_compras_importe: number;
  hoy_ventas_n: number; hoy_ventas_kg: number; ventas_pendientes: number;
}

function Acceso({ href, texto, detalle, icono: Icono, tono, grande }: {
  href: string; texto: string; detalle: string; icono: typeof Scale; tono: Tono; grande?: boolean;
}) {
  const t = TONOS[tono];
  return (
    <Link
      href={href}
      className={cx(
        "group flex items-center gap-4 rounded-2xl border border-stone-200 bg-superficie p-4 shadow-sm transition hover:shadow-md active:scale-[0.99]",
        grande && "py-6 sm:col-span-2",
      )}
    >
      <span className={cx("flex shrink-0 items-center justify-center rounded-xl", t.chip, grande ? "size-16" : "size-12")}>
        <Icono className={grande ? "size-8" : "size-6"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx("block font-semibold text-stone-900", grande ? "text-xl" : "text-base")}>{texto}</span>
        <span className="block text-sm text-stone-500">{detalle}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-stone-400 group-hover:text-stone-600" />
    </Link>
  );
}

/** Inicio del cajero y del balancero: botones grandes para el trabajo del día, sin cifras de gestión. */
export async function InicioOperativo({ ctx }: { ctx: Contexto }) {
  const { supabase, empresa, rol, nombre, userId } = ctx;
  const hoy = hoyLima();
  const rango = rangoLima(hoy, hoy);
  const esBalancero = rol === "balancero";

  let misCompras = supabase.from("v_compras").select("id, numero, fecha, proveedor_nombre, metales, kg_total, total, estado")
    .eq("empresa_id", empresa.id).gte("fecha", rango.desde!).lt("fecha", rango.hasta!)
    .order("fecha", { ascending: false }).limit(8);
  if (esBalancero) misCompras = misCompras.eq("creado_por", userId);

  const [{ data: d }, { data: compras }, { data: precios }, { data: cajas }] = await Promise.all([
    esBalancero ? Promise.resolve({ data: null }) : supabase.rpc("dashboard", { p_empresa: empresa.id }),
    misCompras,
    supabase.from("metales").select("id, nombre, color, precio_compra").eq("empresa_id", empresa.id).eq("activo", true)
      .order("orden").order("nombre"),
    puede(rol, "caja")
      ? supabase.from("v_saldo_caja").select("caja_id, nombre, saldo").eq("empresa_id", empresa.id).eq("activo", true).order("orden")
      : Promise.resolve({ data: null }),
  ]);
  const db = (d ?? {}) as Hoy;

  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-stone-500">Hola, {nombre}</p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">¿Qué vamos a hacer hoy?</h1>
      </div>

      {db.ventas_pendientes > 0 && puede(rol, "vender") && (
        <div className="mb-4">
          <Aviso>
            Hay {db.ventas_pendientes} venta(s) esperando el pesaje del comprador.{" "}
            <Link href="/ventas?estado=pendiente" className="font-medium underline">Confirmar</Link>
          </Aviso>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Acceso grande href="/comprar" texto="Nueva compra" detalle="Pesar y pagar al proveedor" icono={Scale} tono="teal" />
        {puede(rol, "vender") && <Acceso href="/vender" texto="Nueva venta" detalle="Despachar a un cliente" icono={Truck} tono="indigo" />}
        {puede(rol, "caja") && <Acceso href="/caja" texto="Caja" detalle="Gastos, traspasos y arqueo" icono={Wallet} tono="sky" />}
        <Acceso href={`/compras?desde=${hoy}&hasta=${hoy}`} texto={esBalancero ? "Mis compras" : "Compras de hoy"} detalle="Ver, reimprimir tickets" icono={ClipboardList} tono="teal" />
        <Acceso href="/precios" texto="Precios del día" detalle="Lo que pagamos por kilo" icono={Tag} tono="violet" />
      </div>

      {!esBalancero && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi titulo="Compras de hoy" valor={kg(db.hoy_compras_kg)} detalle={`${db.hoy_compras_n ?? 0} compras · ${soles(db.hoy_compras_importe)}`} />
          <Kpi titulo="Ventas de hoy (salida)" valor={kg(db.hoy_ventas_kg)} detalle={`${db.hoy_ventas_n ?? 0} ventas`} />
          {puede(rol, "caja") && <Kpi titulo="En caja" valor={soles(db.caja)} detalle="Todas las cajas" />}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <TituloTarjeta>Precios de compra de hoy</TituloTarjeta>
          <ul className="divide-y divide-stone-100">
            {(precios ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <span className="flex items-center gap-2 font-medium"><PuntoMetal color={m.color} /> {m.nombre}</span>
                <span className="cifra text-lg font-semibold">{soles(m.precio_compra)}<span className="text-xs font-normal text-stone-500"> /kg</span></span>
              </li>
            ))}
            {(precios ?? []).length === 0 && <li className="px-4 py-6 text-center text-sm text-stone-500">Aún no hay productos.</li>}
          </ul>
        </Tarjeta>

        <div className="space-y-4">
          {cajas && (
            <Tarjeta>
              <TituloTarjeta>Saldo por caja</TituloTarjeta>
              <ul className="divide-y divide-stone-100">
                {cajas.map((c) => (
                  <li key={c.caja_id} className="flex justify-between gap-2 px-4 py-2.5 text-sm">
                    <span>{c.nombre}</span>
                    <span className="cifra font-semibold">{soles(c.saldo)}</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
          <Tarjeta>
            <TituloTarjeta>{esBalancero ? "Mis compras de hoy" : "Últimas compras de hoy"}</TituloTarjeta>
            <ul className="divide-y divide-stone-100">
              {(compras ?? []).map((c) => (
                <li key={c.id}>
                  <Link href={`/compras/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-stone-50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">#{c.numero} · {c.proveedor_nombre ?? "Sin documento"}</span>
                      <span className="block truncate text-xs text-stone-500">{fechaHora(c.fecha)} · {c.metales}</span>
                    </span>
                    <span className={cx("cifra text-right", c.estado === "anulada" && "text-stone-400 line-through")}>
                      {soles(c.total)}<span className="block text-xs text-stone-500">{kg(c.kg_total)}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {(compras ?? []).length === 0 && <li className="px-4 py-6 text-center text-sm text-stone-500">Todavía no hay compras hoy.</li>}
            </ul>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
