"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PackageCheck, Undo2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { Campo, InputNumero, Select, Textarea } from "@/components/ui/campos";
import { Aviso, PuntoMetal } from "@/components/ui/basicos";
import { FormularioAccion } from "@/components/ui/formulario";
import { useNotificar } from "@/components/ui/notificaciones";
import { aCentimos, aGramos, centimosASoles, importeCentimos } from "@/lib/montos";
import { kg, soles } from "@/lib/formato";
import type { Caja } from "@/lib/tipos";
import { registrarDevolucion, registrarSeleccion } from "./acciones";

export interface LineaPorSeleccionar {
  id: string;
  metal_nombre: string;
  metal_color: string | null;
  peso_neto_kg: number;
  precio_kg: number;
}

const MOTIVOS = ["Tierra / barro", "Humedad", "Otro material mezclado", "Impurezas (plástico, fierro, jebe)", "Peso de envases / sacos"];

/** Selección en almacén de una compra: todo conforme, o descuento en kg por línea */
export function SeleccionarCompra({ compra, lineas, conProveedor }: {
  compra: { id: string; numero: number; proveedor: string | null };
  lineas: LineaPorSeleccionar[];
  conProveedor: boolean;
}) {
  const router = useRouter();
  const notificar = useNotificar();
  const [abierto, setAbierto] = useState(false);
  const [desc, setDesc] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [detalle, setDetalle] = useState("");
  const [cobrar, setCobrar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<"conforme" | "descuento" | null>(null);

  const totalCent = lineas.reduce((s, l) => s + importeCentimos(aGramos(desc[l.id] ?? ""), aCentimos(String(l.precio_kg))), 0);
  const totalGr = lineas.reduce((s, l) => s + aGramos(desc[l.id] ?? ""), 0);

  async function guardar(conDescuento: boolean) {
    setError(null);
    if (conDescuento && totalGr <= 0) return setError("Ingrese los kilos a descontar en al menos un metal.");
    setGuardando(conDescuento ? "descuento" : "conforme");
    const r = await registrarSeleccion({
      compra_id: compra.id,
      items: conDescuento ? lineas.map((l) => ({ compra_item_id: l.id, kg: desc[l.id] ?? "" })) : [],
      motivo: conDescuento ? [motivo, detalle.trim()].filter(Boolean).join(": ") : null,
      cobrar: conProveedor && cobrar,
    });
    setGuardando(null);
    if (!r.ok) return setError(r.error);
    setAbierto(false);
    notificar(conDescuento
      ? {
          titulo: `Selección N° ${r.data.numero}: descuento de ${kg(r.data.kg)}`,
          mensaje: r.data.cobrar ? `${soles(r.data.importe)} quedan a favor: se descuentan de su próxima compra.` : `${soles(r.data.importe)} registrados como merma.`,
        }
      : { titulo: `Compra N° ${compra.numero} seleccionada`, mensaje: "Todo conforme, sin descuento." });
    router.refresh();
  }

  return (
    <>
      <Boton tamano="sm" onClick={() => setAbierto(true)}><PackageCheck className="size-4" /> Seleccionar</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo={`Selección · Compra N° ${compra.numero}`}>
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            {compra.proveedor ? <>Proveedor: <b>{compra.proveedor}</b>. </> : "Compra sin proveedor identificado. "}
            Si al seleccionar en almacén vino tierra, humedad u otro material, anote los kilos a descontar.
          </p>

          <div className="divide-y divide-stone-100 rounded-lg border border-stone-200">
            {lineas.map((l) => {
              const imp = importeCentimos(aGramos(desc[l.id] ?? ""), aCentimos(String(l.precio_kg)));
              return (
                <div key={l.id} className="grid grid-cols-[1fr_8rem] items-center gap-3 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium"><PuntoMetal color={l.metal_color} />{l.metal_nombre}</p>
                    <p className="text-xs text-stone-500">Comprado {kg(l.peso_neto_kg)} a {soles(l.precio_kg)}/kg</p>
                    {imp > 0 && <p className="cifra text-xs font-medium text-amber-700">Descuento S/ {centimosASoles(imp)}</p>}
                  </div>
                  <Campo etiqueta="Descuento kg">
                    <InputNumero value={desc[l.id] ?? ""} placeholder="0.000"
                      onChange={(e) => setDesc((d) => ({ ...d, [l.id]: e.target.value }))} />
                  </Campo>
                </div>
              );
            })}
          </div>

          {totalGr > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Motivo">
                  <Select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                    {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                  </Select>
                </Campo>
                <Campo etiqueta="Detalle (opcional)">
                  <Textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Ej.: 3 sacos con barro" />
                </Campo>
              </div>
              {conProveedor ? (
                <fieldset className="space-y-2 text-sm">
                  <label className="flex cursor-pointer items-start gap-2">
                    <input type="radio" checked={cobrar} onChange={() => setCobrar(true)} className="mt-0.5 size-4 accent-marca-600" />
                    <span><b className="font-medium">Cobrar al proveedor</b> · queda a nuestro favor y se descuenta de su próxima venta (o lo devuelve).</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input type="radio" checked={!cobrar} onChange={() => setCobrar(false)} className="mt-0.5 size-4 accent-marca-600" />
                    <span><b className="font-medium">Asumirlo nosotros</b> · se registra como merma (baja la utilidad).</span>
                  </label>
                </fieldset>
              ) : (
                <Aviso>Sin proveedor identificado no hay a quién cobrarle: el descuento se registra como merma.</Aviso>
              )}
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span>Total a descontar</span>
                <span className="cifra font-semibold">{(totalGr / 1000).toFixed(3)} kg · S/ {centimosASoles(totalCent)}</span>
              </div>
            </>
          )}

          {error && <Aviso tono="rojo">{error}</Aviso>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Boton variante="secundario" onClick={() => guardar(false)} disabled={!!guardando || totalGr > 0}>
              {guardando === "conforme" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Todo conforme
            </Boton>
            <Boton onClick={() => guardar(true)} disabled={!!guardando || totalGr <= 0}>
              {guardando === "descuento" && <Loader2 className="size-4 animate-spin" />} Registrar descuento
            </Boton>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** El proveedor devuelve en efectivo lo que tiene a nuestro favor */
export function DevolucionProveedor({ proveedor, saldo, cajas }: {
  proveedor: { id: string; nombre: string };
  saldo: number;
  cajas: Pick<Caja, "id" | "nombre">[];
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton tamano="sm" variante="secundario" onClick={() => setAbierto(true)}><Undo2 className="size-4" /> Devolución</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo={`Devolución de ${proveedor.nombre}`} ancho="max-w-md">
        <FormularioAccion accion={registrarDevolucion} textoBoton="Registrar devolución" mensajeExito="Devolución registrada en caja." onExito={() => setAbierto(false)}>
          <input type="hidden" name="proveedor_id" value={proveedor.id} />
          <p className="text-sm text-stone-600">Saldo a favor: <b className="cifra">{soles(saldo)}</b>. Lo que devuelva entra a la caja elegida.</p>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Monto S/"><InputNumero name="monto" defaultValue={saldo.toFixed(2)} required /></Campo>
            <Campo etiqueta="Entra a la caja">
              <Select name="caja_id">{cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select>
            </Campo>
          </div>
          <Campo etiqueta="Nota (opcional)"><Textarea name="nota" /></Campo>
        </FormularioAccion>
      </Modal>
    </>
  );
}
