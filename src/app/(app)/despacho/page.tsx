import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MessageCircle, PackageCheck, Scale, Wallet } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fecha, fechaHora, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, Kpi, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { Pestanas } from "@/components/ui/pestanas";
import { TablaDatos } from "@/components/ui/tabla";
import { BotonAnular } from "@/components/boton-anular";
import { anularDevolucion, anularSeleccion } from "./acciones";
import { DevolucionProveedor, SeleccionarCompra, type LineaPorSeleccionar } from "./seleccionar";

export const metadata: Metadata = { title: "Despacho" };

/** wa.me con el número del proveedor (9 dígitos en Perú → 51…) o solo el texto si no tiene teléfono */
function enlaceWhatsApp(telefono: string | null | undefined, texto: string) {
  const n = (telefono ?? "").replace(/\D/g, "");
  const destino = n.length === 9 ? `51${n}` : n.length >= 11 ? n : "";
  return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
}

export default async function DespachoPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "pendientes" } = await searchParams;
  const { supabase, empresa, rol } = await exigir("comprar", "verTodo");
  const verMontos = puede(rol, "verTodo") || puede(rol, "caja");

  const [{ data: pendientes }, { data: selecciones }, { data: saldos }, { data: devoluciones }, { data: cajas }] = await Promise.all([
    supabase.from("v_compras").select("id, numero, fecha, proveedor_id, proveedor_nombre, metales, kg_total, total, retrasada")
      .eq("empresa_id", empresa.id).eq("por_seleccionar", true).order("fecha"),
    supabase.from("v_selecciones").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(100),
    supabase.from("v_saldo_proveedor").select("*").eq("empresa_id", empresa.id).gt("descontado", 0).order("saldo", { ascending: false }),
    supabase.from("devoluciones_proveedor").select("id, fecha, monto, nota, estado, proveedor_id").eq("empresa_id", empresa.id)
      .order("fecha", { ascending: false }).limit(50),
    supabase.from("cajas").select("id, nombre").eq("empresa_id", empresa.id).eq("activo", true).order("orden"),
  ]);

  const idsPend = (pendientes ?? []).map((p) => p.id);
  const idsProv = [...new Set((selecciones ?? []).map((s) => s.proveedor_id).filter((x): x is string => !!x))];
  const [{ data: lineas }, { data: telefonos }] = await Promise.all([
    idsPend.length
      ? supabase.from("v_compra_items").select("id, compra_id, metal_nombre, metal_color, peso_neto_kg, precio_kg").in("compra_id", idsPend)
      : Promise.resolve({ data: [] as { id: string; compra_id: string; metal_nombre: string; metal_color: string | null; peso_neto_kg: number; precio_kg: number }[] }),
    idsProv.length
      ? supabase.from("proveedores").select("id, telefono").in("id", idsProv)
      : Promise.resolve({ data: [] as { id: string; telefono: string | null }[] }),
  ]);
  const lineasDe = (compra: string): LineaPorSeleccionar[] => (lineas ?? []).filter((l) => l.compra_id === compra)
    .map((l) => ({ id: l.id, metal_nombre: l.metal_nombre, metal_color: l.metal_color, peso_neto_kg: Number(l.peso_neto_kg), precio_kg: Number(l.precio_kg) }));
  const telefonoDe = (id: string | null) => telefonos?.find((t) => t.id === id)?.telefono ?? null;
  const nombreProv = (id: string) => saldos?.find((s) => s.proveedor_id === id)?.nombre ?? "Proveedor";

  const retrasadas = (pendientes ?? []).filter((p) => p.retrasada);
  const kgPend = (pendientes ?? []).reduce((s, p) => s + Number(p.kg_total), 0);
  const porCobrar = (saldos ?? []).reduce((s, x) => s + Number(x.saldo), 0);
  const mes = new Date().toISOString().slice(0, 7);
  const delMes = (selecciones ?? []).filter((s) => s.estado === "registrada" && s.fecha.slice(0, 7) === mes);

  return (
    <>
      <Encabezado
        titulo="Despacho · selección en almacén"
        descripcion={<>El material llega, se selecciona en almacén y aquí se registra lo que vino mal (tierra, humedad, otro material). Plazo para seleccionar: <b>{empresa.dias_seleccion} día(s)</b>{puede(rol, "configurar") && <> · <Link href="/configuracion" className="text-marca-700 hover:underline">cambiar</Link></>}.</>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Por seleccionar" valor={(pendientes ?? []).length} detalle={`${kg(kgPend)} en espera`} />
        <Kpi titulo="Retrasadas" valor={retrasadas.length} tono={retrasadas.length ? "negativo" : undefined}
          detalle={`Más de ${empresa.dias_seleccion} día(s) sin seleccionar`} />
        <Kpi titulo="Descontado este mes" valor={kg(delMes.reduce((s, x) => s + Number(x.kg), 0))}
          detalle={verMontos ? soles(delMes.reduce((s, x) => s + Number(x.importe), 0)) : `${delMes.length} selecciones`} />
        {verMontos && <Kpi titulo="A favor (nos deben)" valor={soles(porCobrar)} detalle="Proveedores con descuento pendiente" />}
      </div>

      <Pestanas
        base="/despacho"
        actual={tab}
        opciones={[
          { valor: "pendientes", texto: "Por seleccionar", cantidad: (pendientes ?? []).length },
          { valor: "historial", texto: "Selecciones" },
          ...(verMontos ? [{ valor: "saldos", texto: "Saldos a favor", cantidad: (saldos ?? []).filter((s) => Number(s.saldo) > 0).length }] : []),
        ]}
      />

      {tab === "pendientes" && (
        <Tarjeta>
          <TablaDatos
            filas={pendientes ?? []}
            clave={(p) => p.id}
            vacio="Todo seleccionado: no hay compras esperando."
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
              { titulo: "Metales", celda: (p) => p.metales },
              { titulo: "Kg", alinear: "der", className: "cifra", celda: (p) => kg(p.kg_total) },
              ...(verMontos ? [{ titulo: "Pagado", alinear: "der" as const, className: "cifra", celda: (p: NonNullable<typeof pendientes>[number]) => soles(p.total) }] : []),
              {
                titulo: "", alinear: "der", principal: true,
                celda: (p) => <SeleccionarCompra compra={{ id: p.id, numero: p.numero, proveedor: p.proveedor_nombre }} lineas={lineasDe(p.id)} conProveedor={!!p.proveedor_id} />,
              },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "historial" && (
        <Tarjeta>
          <TablaDatos
            filas={selecciones ?? []}
            clave={(s) => s.id}
            vacio="Aún no hay selecciones."
            columnas={[
              { titulo: "N°", principal: true, celda: (s) => <span className="font-medium">Selección {s.numero}</span> },
              { titulo: "Fecha", celda: (s) => fechaHora(s.fecha) },
              { titulo: "Compra", celda: (s) => <Link href={`/compras/${s.compra_id}`} className="text-marca-700 hover:underline">N° {s.compra_numero}</Link> },
              { titulo: "Proveedor", celda: (s) => s.proveedor_nombre ?? "Sin documento" },
              {
                titulo: "Resultado",
                celda: (s) => s.estado === "anulada" ? <Insignia tono="rojo">Anulada</Insignia>
                  : Number(s.kg) === 0 ? <Insignia tono="verde">Conforme</Insignia>
                  : <span className="space-y-0.5"><Insignia tono={s.cobrar ? "azul" : "ambar"}>{s.cobrar ? "A cobrar" : "Merma"}</Insignia><span className="block text-xs text-stone-500">{s.detalle}{s.motivo ? ` · ${s.motivo}` : ""}</span></span>,
              },
              { titulo: "Kg", alinear: "der", className: "cifra", celda: (s) => Number(s.kg) ? kg(s.kg) : "—" },
              ...(verMontos ? [{ titulo: "S/", alinear: "der" as const, className: "cifra", celda: (s: NonNullable<typeof selecciones>[number]) => Number(s.importe) ? soles(s.importe) : "—" }] : []),
              {
                titulo: "", alinear: "der",
                celda: (s) => (
                  <span className="flex items-center justify-end gap-2">
                    {s.estado === "registrada" && Number(s.kg) > 0 && s.proveedor_id && (
                      <a
                        href={enlaceWhatsApp(telefonoDe(s.proveedor_id),
                          `Hola ${s.proveedor_nombre}, le saluda ${empresa.razon_social}. En la selección de su compra N° ${s.compra_numero} (${fecha(s.compra_fecha)}) se descontó ${s.detalle}${s.motivo ? ` por ${s.motivo.toLowerCase()}` : ""}, equivalente a ${soles(s.importe)}. ${s.cobrar ? "Este monto se descontará de su próxima venta." : ""}`)}
                        target="_blank"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        <MessageCircle className="size-3.5" /> Avisar
                      </a>
                    )}
                    {puede(rol, "anular") && s.estado === "registrada" && (
                      <BotonAnular id={s.id} accion={anularSeleccion} titulo={`Anular selección N° ${s.numero}`} etiqueta="Anular"
                        explicacion="Los kilos descontados vuelven al stock y la compra queda otra vez por seleccionar." />
                    )}
                  </span>
                ),
              },
            ]}
          />
        </Tarjeta>
      )}

      {tab === "saldos" && verMontos && (
        <div className="space-y-4">
          <Tarjeta>
            <TituloTarjeta>Proveedores con descuentos</TituloTarjeta>
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
              El saldo a favor se descuenta solo en la siguiente compra al mismo proveedor (en Nueva compra aparece marcado), o el proveedor lo devuelve en efectivo.
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
          <PackageCheck className="mr-1 inline size-3.5" />El descuento sale del stock al precio pagado en esa compra. «A cobrar» no es pérdida: el proveedor nos lo debe.
          «Merma» sí baja la utilidad. Todo queda en el kardex de cada metal.
        </span>
      </p>
    </>
  );
}
