import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Clock, Scale, Wallet } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { cargarProductos } from "@/lib/productos";
import { fechaHora, hoyLima, kg, porcentaje, soles } from "@/lib/formato";
import { Encabezado, Insignia, Kpi, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { Pestanas } from "@/components/ui/pestanas";
import { TablaDatos } from "@/components/ui/tabla";
import { BotonAnular } from "@/components/boton-anular";
import { anularDevolucion, anularSeleccion } from "./acciones";
import { DevolucionProveedor, LimpiarCompra, type LineaPorLimpiar } from "./limpiar";

export const metadata: Metadata = { title: "Limpieza" };

export default async function LimpiezaPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "pendientes" } = await searchParams;
  const ctx = await exigir("limpiar", "verTodo");
  const { supabase, empresa, rol } = ctx;
  const verMontos = puede(rol, "verCostos") || puede(rol, "caja");
  const alerta = Number(empresa.merma_alerta_pct ?? 5);

  const [{ data: pendientes }, { data: limpiezas }, { data: saldos }, { data: devoluciones }, { data: cajas }, productos] = await Promise.all([
    supabase.from("v_compras").select("id, numero, fecha, proveedor_id, proveedor_nombre, metales, kg_total, total, retrasada")
      .eq("empresa_id", empresa.id).eq("por_seleccionar", true).order("fecha"),
    supabase.from("v_selecciones").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(150),
    supabase.from("v_saldo_proveedor").select("*").eq("empresa_id", empresa.id).gt("descontado", 0).order("saldo", { ascending: false }),
    supabase.from("devoluciones_proveedor").select("id, fecha, monto, nota, estado, proveedor_id").eq("empresa_id", empresa.id)
      .order("fecha", { ascending: false }).limit(50),
    supabase.from("cajas").select("id, nombre").eq("empresa_id", empresa.id).eq("activo", true).order("orden"),
    cargarProductos(ctx),
  ]);

  const idsPend = (pendientes ?? []).map((p) => p.id);
  const { data: lineas } = idsPend.length
    ? await supabase.from("v_compra_items").select("id, compra_id, metal_id, metal_nombre, metal_color, peso_neto_kg, precio_kg").in("compra_id", idsPend)
    : { data: [] as { id: string; compra_id: string; metal_id: string; metal_nombre: string; metal_color: string | null; peso_neto_kg: number; precio_kg: number }[] };
  const ruta = new Map(productos.map((p) => [p.id, p.ruta]));
  const lineasDe = (compra: string): LineaPorLimpiar[] => (lineas ?? []).filter((l) => l.compra_id === compra)
    .map((l) => ({
      id: l.id, metal_id: l.metal_id, producto: ruta.get(l.metal_id) ?? l.metal_nombre, metal_color: l.metal_color,
      peso_neto_kg: Number(l.peso_neto_kg), precio_kg: verMontos ? Number(l.precio_kg) : 0,
    }));
  const nombreProv = (id: string) => saldos?.find((s) => s.proveedor_id === id)?.nombre ?? "Proveedor";
  const conSaldos = (saldos ?? []).length > 0;

  const retrasadas = (pendientes ?? []).filter((p) => p.retrasada);
  const kgPend = (pendientes ?? []).reduce((s, p) => s + Number(p.kg_total), 0);
  const mes = hoyLima().slice(0, 7);
  const delMes = (limpiezas ?? []).filter((s) => s.estado === "registrada" && !s.cobrar && s.fecha.slice(0, 7) === mes);
  const mermaMes = delMes.reduce((s, x) => s + Number(x.kg), 0);
  const baseMes = delMes.reduce((s, x) => s + Number(x.kg_base ?? 0), 0);
  const altas = delMes.filter((x) => x.merma_alta).length;

  return (
    <>
      <Encabezado
        titulo="Limpieza"
        descripcion={<>Lo comprado se limpia y se vuelve a pesar: la merma queda en kilos (y en soles) y el material de otra clase pasa al stock de su producto. Plazo para limpiar: <b>{empresa.dias_seleccion} día(s)</b>{puede(rol, "configurar") && <> · <Link href="/configuracion" className="text-marca-700 hover:underline">cambiar</Link></>}.</>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Por limpiar" valor={(pendientes ?? []).length} detalle={`${kg(kgPend)} en espera`} />
        <Kpi titulo="Retrasadas" valor={retrasadas.length} tono={retrasadas.length ? "negativo" : undefined}
          detalle={`Más de ${empresa.dias_seleccion} día(s) sin limpiar`} />
        <Kpi titulo="Merma del mes" valor={kg(mermaMes)} detalle={baseMes > 0 ? `${porcentaje((mermaMes * 100) / baseMes)} de lo limpiado` : `${delMes.length} limpiezas`} />
        <Kpi titulo="Merma alta" valor={altas} tono={altas ? "negativo" : undefined} detalle={`Limpiezas del mes con más de ${porcentaje(alerta)}`} />
      </div>

      <Pestanas
        base="/limpieza"
        actual={tab}
        opciones={[
          { valor: "pendientes", texto: "Por limpiar", cantidad: (pendientes ?? []).length },
          { valor: "historial", texto: "Limpiezas" },
          ...(verMontos && conSaldos ? [{ valor: "saldos", texto: "Saldos a favor", cantidad: (saldos ?? []).filter((s) => Number(s.saldo) > 0).length }] : []),
        ]}
      />

      {tab === "pendientes" && (
        <Tarjeta>
          <TablaDatos
            filas={pendientes ?? []}
            clave={(p) => p.id}
            vacio="Todo limpio: no hay compras esperando."
            columnas={[
              { titulo: "Compra", principal: true, celda: (p) => <Link href={`/compras/${p.id}`} className="font-medium text-marca-700 hover:underline">N° {p.numero}</Link> },
              { titulo: "Llegó", celda: (p) => fechaHora(p.fecha) },
              {
                titulo: "Espera",
                celda: (p) => {
                  const d = Math.floor((Date.now() - new Date(p.fecha).getTime()) / 86400_000);
                  return p.retrasada
                    ? <Insignia tono="rojo"><Clock className="mr-1 size-3" />Retrasada · {d} días</Insignia>
                    : <Insignia tono="ambar">{d === 0 ? "Hoy" : `${d} día(s)`}</Insignia>;
                },
              },
              { titulo: "Proveedor", celda: (p) => p.proveedor_nombre ?? "Sin documento" },
              { titulo: "Productos", celda: (p) => p.metales },
              { titulo: "Kg", alinear: "der", className: "cifra", celda: (p) => kg(p.kg_total) },
              ...(verMontos ? [{ titulo: "Pagado", alinear: "der" as const, className: "cifra", celda: (p: NonNullable<typeof pendientes>[number]) => soles(p.total) }] : []),
              {
                titulo: "", alinear: "der", principal: true,
                celda: (p) => (
                  <LimpiarCompra compra={{ id: p.id, numero: p.numero, proveedor: p.proveedor_nombre }} lineas={lineasDe(p.id)}
                    productos={productos} verMontos={verMontos} alertaPct={alerta} />
                ),
              },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "historial" && (
        <Tarjeta>
          <TablaDatos
            filas={limpiezas ?? []}
            clave={(s) => s.id}
            vacio="Aún no hay limpiezas."
            columnas={[
              { titulo: "N°", principal: true, celda: (s) => <span className="font-medium">{s.cobrar ? "Selección" : "Limpieza"} {s.numero}</span> },
              { titulo: "Fecha", celda: (s) => fechaHora(s.fecha) },
              { titulo: "Compra", celda: (s) => <Link href={`/compras/${s.compra_id}`} className="text-marca-700 hover:underline">N° {s.compra_numero}</Link> },
              { titulo: "Proveedor", ocultarMovil: true, celda: (s) => s.proveedor_nombre ?? "Sin documento" },
              {
                titulo: "Resultado",
                celda: (s) => s.estado === "anulada" ? <Insignia tono="rojo">Anulada</Insignia>
                  : Number(s.kg) === 0 && Number(s.kg_traslado) === 0 ? <Insignia tono="verde">Conforme</Insignia>
                  : (
                    <span className="space-y-0.5">
                      {s.cobrar ? <Insignia tono="azul">A cobrar</Insignia>
                        : Number(s.kg) > 0 ? <Insignia tono={s.merma_alta ? "rojo" : "ambar"}>{s.merma_alta && <AlertTriangle className="mr-1 size-3" />}Merma {porcentaje(s.merma_pct)}</Insignia>
                        : <Insignia tono="azul">Separado</Insignia>}
                      <span className="block text-xs text-stone-500">
                        {[s.detalle, s.detalle_traslado && `Separado: ${s.detalle_traslado}`, s.motivo].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  ),
              },
              { titulo: "Merma kg", alinear: "der", className: "cifra", celda: (s) => Number(s.kg) ? kg(s.kg) : "—" },
              ...(verMontos ? [{ titulo: "Merma S/", alinear: "der" as const, className: "cifra", celda: (s: NonNullable<typeof limpiezas>[number]) => Number(s.importe) ? soles(s.importe) : "—" }] : []),
              {
                titulo: "", alinear: "der",
                celda: (s) => puede(rol, "corregir") && s.estado === "registrada" ? (
                  <BotonAnular id={s.id} accion={anularSeleccion} titulo={`Anular limpieza N° ${s.numero}`} etiqueta="Anular"
                    explicacion="La merma y lo separado vuelven al stock del producto y la compra queda otra vez por limpiar." />
                ) : null,
              },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "saldos" && verMontos && conSaldos && (
        <div className="space-y-4">
          <Tarjeta>
            <TituloTarjeta>Proveedores con descuentos (versión anterior)</TituloTarjeta>
            <TablaDatos
              filas={saldos ?? []}
              clave={(s) => s.proveedor_id}
              enlace={(s) => `/proveedores/${s.proveedor_id}`}
              vacio="Ningún proveedor tiene descuentos registrados."
              columnas={[
                { titulo: "Proveedor", principal: true, celda: (s) => <span className="font-medium">{s.nombre}</span> },
                { titulo: "Descontado", alinear: "der", className: "cifra", celda: (s) => soles(s.descontado) },
                { titulo: "Cobrado en compras", alinear: "der", className: "cifra", celda: (s) => soles(s.aplicado) },
                { titulo: "Devuelto", alinear: "der", className: "cifra", celda: (s) => soles(s.devuelto) },
                { titulo: "Saldo a favor", alinear: "der", principal: true, celda: (s) => <span className={`cifra font-semibold ${Number(s.saldo) > 0 ? "text-emerald-700" : ""}`}>{soles(s.saldo)}</span> },
                {
                  titulo: "", alinear: "der",
                  celda: (s) => Number(s.saldo) > 0 && puede(rol, "caja")
                    ? <DevolucionProveedor proveedor={{ id: s.proveedor_id, nombre: s.nombre }} saldo={Number(s.saldo)} cajas={cajas ?? []} />
                    : null,
                },
              ]}
            />
            <p className="flex items-start gap-2 border-t border-stone-100 px-4 py-3 text-xs text-stone-500">
              <Wallet className="mt-px size-3.5 shrink-0" />
              Saldos de la versión anterior (descuento en soles). Se descuentan solos en la siguiente compra al mismo proveedor o se devuelven en efectivo.
            </p>
          </Tarjeta>

          <Tarjeta>
            <TituloTarjeta>Devoluciones en efectivo</TituloTarjeta>
            <TablaDatos
              filas={devoluciones ?? []}
              clave={(d) => d.id}
              vacio="Sin devoluciones."
              columnas={[
                { titulo: "Fecha", principal: true, celda: (d) => fechaHora(d.fecha) },
                { titulo: "Proveedor", celda: (d) => nombreProv(d.proveedor_id) },
                { titulo: "Nota", celda: (d) => d.nota ?? "—" },
                { titulo: "Estado", celda: (d) => d.estado === "anulada" ? <Insignia tono="rojo">Anulada</Insignia> : <Insignia tono="verde">Registrada</Insignia> },
                { titulo: "Monto", alinear: "der", principal: true, className: "cifra", celda: (d) => soles(d.monto) },
                {
                  titulo: "", alinear: "der",
                  celda: (d) => puede(rol, "anular") && d.estado === "registrada"
                    ? <BotonAnular id={d.id} accion={anularDevolucion} titulo="Anular devolución" etiqueta="Anular" explicacion="Se quita el ingreso de caja y el saldo vuelve a quedar a favor." />
                    : null,
                },
              ]}
            />
          </Tarjeta>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs text-stone-500">
        <Scale className="mt-px size-3.5 shrink-0" />
        <span>
          La merma sale del stock al precio pagado en esa compra y baja la utilidad. Lo separado entra al otro producto a su precio de compra
          del día (si es menor al pagado, la diferencia también es pérdida). Todo queda en el kardex de cada producto.
        </span>
      </p>
    </>
  );
}
