"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, PackageCheck, Plus, Trash2, Undo2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { Campo, InputNumero, Select, Textarea } from "@/components/ui/campos";
import { Aviso, PuntoMetal } from "@/components/ui/basicos";
import { FormularioAccion } from "@/components/ui/formulario";
import { useNotificar } from "@/components/ui/notificaciones";
import { OpcionesProducto } from "@/components/selector-producto";
import { aCentimos, aGramos, centimosASoles, gramosAKg, importeCentimos } from "@/lib/montos";
import { kg, porcentaje, soles } from "@/lib/formato";
import type { Caja, Producto } from "@/lib/tipos";
import { registrarDevolucion, registrarLimpieza } from "./acciones";

export interface LineaPorLimpiar {
  id: string;
  metal_id: string;
  producto: string;
  metal_color: string | null;
  peso_neto_kg: number;
  precio_kg: number;
}

interface Traslado { uid: string; metal_id: string; kg: string }

const MOTIVOS = ["Tierra / barro", "Humedad", "Otro material mezclado", "Impurezas (plástico, jebe)", "Peso de envases / sacos"];

/**
 * Limpieza de una compra: se vuelve a pesar cada producto. La merma queda en kilos (y su valor en
 * soles); lo que resultó ser otro material pasa al stock de ese producto.
 */
export function LimpiarCompra({ compra, lineas, productos, verMontos, alertaPct }: {
  compra: { id: string; numero: number; proveedor: string | null };
  lineas: LineaPorLimpiar[];
  productos: Producto[];
  verMontos: boolean;
  alertaPct: number;
}) {
  const router = useRouter();
  const notificar = useNotificar();
  const [abierto, setAbierto] = useState(false);
  const [limpio, setLimpio] = useState<Record<string, string>>({});
  const [traslados, setTraslados] = useState<Record<string, Traslado[]>>({});
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Vista previa en gramos y céntimos; los valores oficiales los calcula la BD
  const calculo = lineas.map((l) => {
    const neto = aGramos(String(l.peso_neto_kg));
    const tras = (traslados[l.id] ?? []).reduce((s, t) => s + aGramos(t.kg), 0);
    const pesado = (limpio[l.id] ?? "").trim() !== "";
    const merma = pesado ? neto - aGramos(limpio[l.id]) - tras : 0;
    return { neto, tras, merma, pesado, importe: importeCentimos(Math.max(merma, 0), aCentimos(String(l.precio_kg))) };
  });
  const netoTotal = calculo.reduce((s, c) => s + c.neto, 0);
  const mermaTotal = calculo.reduce((s, c) => s + Math.max(c.merma, 0), 0);
  const trasTotal = calculo.reduce((s, c) => s + c.tras, 0);
  const pct = netoTotal > 0 ? (mermaTotal * 100) / netoTotal : 0;
  const hayCambios = calculo.some((c) => c.pesado || c.tras > 0);

  function agregarTraslado(linea: string) {
    setTraslados((t) => ({ ...t, [linea]: [...(t[linea] ?? []), { uid: crypto.randomUUID(), metal_id: "", kg: "" }] }));
  }
  function cambiarTraslado(linea: string, uid: string, campo: "metal_id" | "kg", v: string) {
    setTraslados((t) => ({ ...t, [linea]: (t[linea] ?? []).map((x) => (x.uid === uid ? { ...x, [campo]: v } : x)) }));
  }

  async function guardar() {
    setError(null);
    for (const [i, l] of lineas.entries()) {
      const c = calculo[i];
      if (c.merma < 0 || c.tras > c.neto) return setError(`En ${l.producto} lo limpio más lo separado supera lo comprado (${kg(l.peso_neto_kg)}).`);
      if ((traslados[l.id] ?? []).some((t) => aGramos(t.kg) > 0 && !t.metal_id)) return setError(`Elija a qué producto pasa lo separado de ${l.producto}.`);
    }
    setGuardando(true);
    const r = await registrarLimpieza({
      compra_id: compra.id,
      lineas: lineas.map((l) => ({ compra_item_id: l.id, kg_limpio: limpio[l.id] ?? "", traslados: (traslados[l.id] ?? []).map(({ metal_id, kg }) => ({ metal_id, kg })) })),
      motivo: hayCambios ? [motivo, detalle.trim()].filter(Boolean).join(": ") || null : null,
    });
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    setAbierto(false);
    const d = r.data;
    notificar(Number(d.kg_merma) > 0 || Number(d.kg_traslado) > 0
      ? {
          titulo: `Limpieza N° ${d.numero}: merma ${kg(d.kg_merma)} (${porcentaje(d.pct_merma)})`,
          mensaje: [verMontos && Number(d.kg_merma) > 0 && `${soles(d.importe_merma)} de pérdida.`,
            Number(d.kg_traslado) > 0 && `${kg(d.kg_traslado)} pasaron a otro producto.`].filter(Boolean).join(" "),
        }
      : { titulo: `Compra N° ${compra.numero} limpia`, mensaje: "Todo conforme, sin merma." });
    router.refresh();
  }

  return (
    <>
      <Boton tamano="sm" onClick={() => setAbierto(true)}><PackageCheck className="size-4" /> Limpiar</Boton>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo={`Limpieza · Compra N° ${compra.numero}`}>
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            {compra.proveedor ? <>Proveedor: <b>{compra.proveedor}</b>. </> : null}
            Vuelva a pesar cada producto ya limpio. Si salió otro material (p. ej. fierro dentro del aluminio), sepárelo: pasa al stock de ese producto.
          </p>

          <div className="space-y-3">
            {lineas.map((l, i) => {
              const c = calculo[i];
              const lineaPct = c.neto > 0 ? (Math.max(c.merma, 0) * 100) / c.neto : 0;
              return (
                <div key={l.id} className="rounded-lg border border-stone-200 p-3">
                  <div className="grid grid-cols-[1fr_8.5rem] items-end gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium"><PuntoMetal color={l.metal_color} /><span className="truncate">{l.producto}</span></p>
                      <p className="text-xs text-stone-500">Comprado {kg(l.peso_neto_kg)}{verMontos && <> a {soles(l.precio_kg)}/kg</>}</p>
                    </div>
                    <Campo etiqueta="Peso limpio kg">
                      <InputNumero value={limpio[l.id] ?? ""} placeholder={l.peso_neto_kg.toFixed(3)}
                        onChange={(e) => setLimpio((x) => ({ ...x, [l.id]: e.target.value }))} />
                    </Campo>
                  </div>

                  {(traslados[l.id] ?? []).map((t) => (
                    <div key={t.uid} className="mt-2 grid grid-cols-[auto_1fr_6.5rem_auto] items-center gap-2">
                      <ArrowRight className="size-4 text-stone-400" />
                      <Select aria-label="Pasa a" value={t.metal_id} onChange={(e) => cambiarTraslado(l.id, t.uid, "metal_id", e.target.value)} className="py-1.5 text-sm">
                        <option value="">Pasa a…</option>
                        <OpcionesProducto productos={productos} excluir={l.metal_id} />
                      </Select>
                      <InputNumero aria-label="Kilos separados" value={t.kg} placeholder="kg" className="py-1.5"
                        onChange={(e) => cambiarTraslado(l.id, t.uid, "kg", e.target.value)} />
                      <button type="button" aria-label="Quitar" onClick={() => setTraslados((x) => ({ ...x, [l.id]: (x[l.id] ?? []).filter((y) => y.uid !== t.uid) }))}
                        className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
                    </div>
                  ))}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <button type="button" onClick={() => agregarTraslado(l.id)} className="inline-flex items-center gap-1 text-xs font-medium text-marca-700 hover:underline">
                      <Plus className="size-3.5" /> Salió otro material
                    </button>
                    {(c.pesado || c.tras > 0) && (
                      <p className={`cifra text-xs font-medium ${c.merma < 0 ? "text-red-700" : lineaPct > alertaPct ? "text-red-700" : "text-amber-700"}`}>
                        {c.merma < 0 ? "Lo limpio + separado supera lo comprado"
                          : <>Merma {gramosAKg(Math.max(c.merma, 0))} kg ({lineaPct.toFixed(1)} %){verMontos && <> · S/ {centimosASoles(c.importe)}</>}
                            {c.tras > 0 && <> · separado {gramosAKg(c.tras)} kg</>}</>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {hayCambios && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Motivo (opcional)">
                  <Select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                    <option value="">—</option>
                    {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                  </Select>
                </Campo>
                <Campo etiqueta="Nota (opcional)">
                  <Textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Ej.: 3 sacos con barro" />
                </Campo>
              </div>
              <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${pct > alertaPct ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900"}`}>
                <span>Merma de la compra{pct > alertaPct && " · alta, la verá Gerencia"}</span>
                <span className="cifra font-semibold">
                  {gramosAKg(mermaTotal)} kg · {pct.toFixed(1)} %
                  {verMontos && <> · S/ {centimosASoles(calculo.reduce((s, c) => s + c.importe, 0))}</>}
                  {trasTotal > 0 && <> · separado {gramosAKg(trasTotal)} kg</>}
                </span>
              </div>
            </>
          )}

          {error && <Aviso tono="rojo">{error}</Aviso>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {!hayCambios ? (
              <Boton onClick={guardar} disabled={guardando}>
                {guardando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Todo conforme
              </Boton>
            ) : (
              <Boton onClick={guardar} disabled={guardando}>
                {guardando && <Loader2 className="size-4 animate-spin" />} Guardar limpieza
              </Boton>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

/** El proveedor devuelve en efectivo lo que tiene a nuestro favor (descuentos de la versión anterior) */
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
