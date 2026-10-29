import Link from "next/link";
import { BarChart3, ChevronRight, ClipboardList, PackageCheck, Scale, Tag, Truck, Wallet } from "lucide-react";
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

interface DatosAcceso { href: string; texto: string; detalle: string; icono: typeof Scale; tono: Tono }

/** Acceso grande principal (Nueva compra): botón lleno de marca, lo primero que se toca en el mostrador */
function AccesoPrincipal({ href, texto, detalle, icono: Icono }: DatosAcceso) {
  return (
    <Link
      href={href}
      className="group flex min-h-24 items-center gap-4 rounded-2xl bg-gradient-to-br from-marca-500 to-marca-600 p-5 text-white shadow-md transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-500 focus-visible:ring-offset-2 focus-visible:ring-offset-fondo active:scale-[0.99] sm:col-span-2"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icono className="size-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-2xl font-bold tracking-tight">{texto}</span>
        <span className="block text-sm text-white/85">{detalle}</span>
      </span>
      <ChevronRight className="size-6 shrink-0 text-white/80 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function Acceso({ href, texto, detalle, icono: Icono, tono, ancho }: DatosAcceso & { ancho?: boolean }) {
  const t = TONOS[tono];
  return (
    <Link
      href={href}
      className={cx(
        "group flex items-center gap-4 rounded-2xl border border-stone-200 bg-superficie p-4 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-500 active:scale-[0.99]",
        ancho && "sm:col-span-2",
      )}
    >
      <span className={cx("flex size-12 shrink-0 items-center justify-center rounded-xl", t.chip)}>
        <Icono className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-stone-900">{texto}</span>
        <span className="block text-sm text-stone-600">{detalle}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-stone-400 group-hover:text-stone-600" />
    </Link>
  );
}

/** Inicio de Almacén, del balancero y de Administración: botones grandes para el trabajo del día, sin cifras de gestión. */
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

  // Accesos según lo que puede cada rol; si quedan impares, el último ocupa la fila entera (sin hueco)
  const accesos: DatosAcceso[] = [
    ...(puede(rol, "vender") ? [{ href: "/vender", texto: "Nueva venta", detalle: "Despachar a un cliente", icono: Truck, tono: "ventas" as const }] : []),
    ...(puede(rol, "caja") ? [{ href: "/caja", texto: "Caja", detalle: "Gastos, traspasos y arqueo", icono: Wallet, tono: "caja" as const }] : []),
    { href: `/compras?desde=${hoy}&hasta=${hoy}`, texto: esBalancero ? "Mis compras" : "Compras de hoy", detalle: "Ver, reimprimir tickets", icono: ClipboardList, tono: "compras" },
    puede(rol, "editarPrecios")
      ? { href: "/precios", texto: "Productos y precios", detalle: "Fijar los precios del día", icono: Tag, tono: "inventario" }
      : { href: "/precios", texto: "Precios del día", detalle: "Lo que pagamos por kilo", icono: Tag, tono: "inventario" },
    ...(puede(rol, "limpiar") && !esBalancero ? [{ href: "/limpieza", texto: "Limpieza", detalle: "Volver a pesar y separar material", icono: PackageCheck, tono: "inventario" as const }] : []),
    ...(puede(rol, "verReportes") ? [{ href: "/reportes", texto: "Reportes", detalle: "Compras, ventas, stock y mermas", icono: BarChart3, tono: "gestion" as const }] : []),
  ];

  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-stone-600">Hola, {nombre}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">¿Qué vamos a hacer hoy?</h1>
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
        <AccesoPrincipal href="/comprar" texto="Nueva compra" detalle="Pesar y pagar al proveedor" icono={Scale} tono="compras" />
        {accesos.map((a, i) => <Acceso key={a.href} {...a} ancho={accesos.length % 2 === 1 && i === accesos.length - 1} />)}
      </div>

      {!esBalancero && (
        <div className={cx("mb-4 grid grid-cols-2 gap-3", puede(rol, "caja") && "lg:grid-cols-3")}>
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
              <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="flex items-center gap-2 text-base font-medium"><PuntoMetal color={m.color} /> {m.nombre}</span>
                <span className="cifra text-xl font-bold">{soles(m.precio_compra)}<span className="text-xs font-normal text-stone-500"> /kg</span></span>
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
                    <span className={cx("cifra text-right", c.estado === "anulada" && "text-stone-500 line-through")}>
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
