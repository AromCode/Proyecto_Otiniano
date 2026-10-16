import type { Metadata } from "next";
import Link from "next/link";
import { Scale, Truck } from "lucide-react";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { kg, nombrePeriodo, soles } from "@/lib/formato";
import { Aviso, Kpi, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { BotonLink } from "@/components/ui/boton";
import { GraficoStock, GraficoUtilidad } from "@/components/graficos";
import { InicioOperativo } from "./inicio-operativo";

export const metadata: Metadata = { title: "Inicio" };

interface Dashboard {
  caja: number; stock_costo: number; stock_precio_venta: number; en_transito: number; capital: number;
  activos: number; ganancia_acumulada: number; periodo: string; utilidad_mes: number; ventas_mes: number;
  compras_mes: number; gastos_mes: number; merma_mes: number; hoy_compras_n: number; hoy_compras_kg: number;
  hoy_compras_importe: number; hoy_ventas_n: number; hoy_ventas_kg: number; ventas_pendientes: number;
}

export default async function Inicio() {
  const ctx = await obtenerContexto();
  const { supabase, empresa, rol, nombre } = ctx;
  // Cajero y balancero: inicio de trabajo diario (botones grandes); dueño y socios: el resumen de gestión
  if (!puede(rol, "verTodo")) return <InicioOperativo ctx={ctx} />;

  const [{ data: d }, { data: meses }, { data: stock }] = await Promise.all([
    supabase.rpc("dashboard", { p_empresa: empresa.id }),
    supabase.from("v_resultado_mes").select("periodo, utilidad, ventas, gastos").eq("empresa_id", empresa.id)
      .order("periodo", { ascending: false }).limit(12),
    supabase.from("v_stock_metal").select("nombre, color, kg, valor_costo").eq("empresa_id", empresa.id).gt("kg", 0)
      .order("valor_costo", { ascending: false }),
  ]);
  const db = (d ?? {}) as Dashboard;
  const verTodo = puede(rol, "verTodo");

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

      {db.ventas_pendientes > 0 && (
        <div className="mb-4">
          <Aviso>
            Hay {db.ventas_pendientes} venta(s) esperando el pesaje del comprador.{" "}
            <Link href="/ventas?estado=pendiente" className="font-medium underline">Confirmar</Link>
          </Aviso>
        </div>
      )}

      {/* Lo que pidió el cliente: caja + mercadería = lo que tenemos, vs. capital */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="En caja" valor={soles(db.caja)} detalle={<Link href="/caja" className="hover:underline">Ver cajas</Link>} />
        <Kpi titulo="En mercadería" valor={soles(Number(db.stock_costo) + Number(db.en_transito))} detalle="Stock a costo promedio" />
        {verTodo && <Kpi titulo="Total (caja + mercadería)" valor={soles(db.activos)} detalle={`Capital aportado ${soles(db.capital)}`} />}
        {verTodo && (
          <Kpi
            titulo="Ganancia acumulada"
            valor={soles(db.ganancia_acumulada)}
            tono={Number(db.ganancia_acumulada) >= 0 ? "positivo" : "negativo"}
            detalle="Lo que tenemos − capital"
          />
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {verTodo && (
          <Kpi
            titulo={`Utilidad ${nombrePeriodo(db.periodo ?? "2000-01")}`}
            valor={soles(db.utilidad_mes)}
            tono={Number(db.utilidad_mes) >= 0 ? "positivo" : "negativo"}
            detalle={`Ventas ${soles(db.ventas_mes)} · Gastos ${soles(db.gastos_mes)}`}
          />
        )}
        <Kpi titulo="Compras de hoy" valor={kg(db.hoy_compras_kg)} detalle={`${db.hoy_compras_n ?? 0} compras · ${soles(db.hoy_compras_importe)}`} />
        <Kpi titulo="Ventas de hoy (salida)" valor={kg(db.hoy_ventas_kg)} detalle={`${db.hoy_ventas_n ?? 0} ventas`} />
        {verTodo && <Kpi titulo="Merma del mes" valor={soles(db.merma_mes)} detalle="Valorizada a costo" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {verTodo && (
          <Tarjeta className="lg:col-span-3">
            <TituloTarjeta accion={<Link href="/reportes?r=resultados" className="text-xs font-medium text-marca-700">Estado de resultados</Link>}>
              Utilidad por mes
            </TituloTarjeta>
            <GraficoUtilidad
              datos={(meses ?? []).slice().reverse().map((m) => ({
                periodo: m.periodo, utilidad: Number(m.utilidad), ventas: Number(m.ventas), gastos: Number(m.gastos),
              }))}
            />
          </Tarjeta>
        )}
        <Tarjeta className={verTodo ? "lg:col-span-2" : "lg:col-span-5"}>
          <TituloTarjeta accion={<Link href="/inventario" className="text-xs font-medium text-marca-700">Inventario</Link>}>
            Stock por metal
          </TituloTarjeta>
          <GraficoStock datos={(stock ?? []).map((s) => ({ nombre: s.nombre, color: s.color, kg: Number(s.kg), valor: Number(s.valor_costo) }))} />
        </Tarjeta>
      </div>
    </>
  );
}
