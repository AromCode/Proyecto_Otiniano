"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Plus, Trash2 } from "lucide-react";
import { Campo, Input, InputNumero, Select, Textarea } from "@/components/ui/campos";
import { Aviso, PuntoMetal, Tarjeta } from "@/components/ui/basicos";
import { Boton } from "@/components/ui/boton";
import { aCentimos, aGramos, centimosASoles, gramosAKg, importeCentimos, normalizar } from "@/lib/montos";
import { ETIQUETA_MEDIO, kg } from "@/lib/formato";
import { subirArchivo } from "@/lib/archivos";
import type { Caja, Comprador, MedioPago } from "@/lib/tipos";
import { registrarVenta } from "../ventas/acciones";

export interface MetalConStock {
  metal_id: string;
  nombre: string;
  color: string | null;
  kg: string;
  costo_promedio: string | null;
  precio_venta: string;
}

interface Linea {
  uid: string;
  metal_id: string;
  salida: string;
  recibido: string;
  precio: string;
}

export function FormVenta({
  empresaId, metales, compradores, cajas,
}: { empresaId: string; metales: MetalConStock[]; compradores: Comprador[]; cajas: Caja[] }) {
  const router = useRouter();
  const [clave] = useState(() => crypto.randomUUID());
  const [compradorId, setCompradorId] = useState(compradores[0]?.id ?? "");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [confirmarYa, setConfirmarYa] = useState(false);
  const [cajaId, setCajaId] = useState(() => cajas.find((c) => c.tipo === "banco")?.id ?? cajas[0]?.id ?? "");
  const [medio, setMedio] = useState<MedioPago>("transferencia");
  const [guiaNumero, setGuiaNumero] = useState("");
  const [guia, setGuia] = useState<File | null>(null);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const metal = (id: string) => metales.find((m) => m.metal_id === id)!;
  const usados = new Set(lineas.map((l) => l.metal_id));
  const disponibles = metales.filter((m) => !usados.has(m.metal_id));

  function agregar(id: string) {
    const m = metal(id);
    setLineas((ls) => [...ls, { uid: crypto.randomUUID(), metal_id: id, salida: "", recibido: "", precio: m.precio_venta }]);
  }
  function cambiar(uid: string, campo: keyof Linea, v: string) {
    setLineas((ls) => ls.map((l) => (l.uid === uid ? { ...l, [campo]: v } : l)));
  }

  const totalSalida = lineas.reduce((s, l) => s + aGramos(l.salida), 0);
  const totalImporte = lineas.reduce((s, l) => s + importeCentimos(aGramos(l.recibido), aCentimos(l.precio)), 0);

  async function guardar() {
    setError(null);
    if (!compradorId) return setError("Elija el comprador.");
    if (lineas.length === 0) return setError("Agregue al menos un metal.");
    for (const l of lineas) {
      const m = metal(l.metal_id);
      if (aGramos(l.salida) <= 0) return setError(`Ingrese el peso de salida de ${m.nombre}.`);
      if (aGramos(l.salida) > aGramos(m.kg)) return setError(`No hay suficiente ${m.nombre}: stock ${kg(m.kg)}.`);
      if (confirmarYa && (!normalizar(l.recibido) || !normalizar(l.precio))) {
        return setError(`Ingrese el peso recibido y el precio de ${m.nombre}.`);
      }
    }
    setGuardando(true);
    try {
      const rutaGuia = guia ? await subirArchivo(empresaId, "guias", guia) : null;
      const r = await registrarVenta({
        clave,
        comprador_id: compradorId,
        items: lineas.map((l) => ({
          metal_id: l.metal_id,
          peso_salida_kg: normalizar(l.salida),
          ...(confirmarYa ? { peso_recibido_kg: normalizar(l.recibido), precio_kg: normalizar(l.precio) } : {}),
        })),
        guia_numero: guiaNumero.trim() || null,
        guia_url: rutaGuia,
        notas: notas.trim() || null,
        caja_id: confirmarYa ? cajaId : null,
        medio_pago: confirmarYa ? medio : null,
        comprobante_url: null,
      });
      if (!r.ok) {
        setError(r.error);
        setGuardando(false);
      } else {
        router.push(`/ventas/${r.data.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Nueva venta</h1>

      <Tarjeta className="grid gap-3 p-4 sm:grid-cols-2">
        <Campo etiqueta="Comprador">
          <Select value={compradorId} onChange={(e) => setCompradorId(e.target.value)}>
            {compradores.map((c) => <option key={c.id} value={c.id}>{c.razon_social}{c.ruc ? ` · ${c.ruc}` : ""}</option>)}
          </Select>
        </Campo>
        <Campo etiqueta="N° de guía de traslado">
          <Input value={guiaNumero} onChange={(e) => setGuiaNumero(e.target.value)} placeholder="T001-000123" />
        </Campo>
        <Campo etiqueta="Foto o PDF de la guía (opcional)" className="sm:col-span-2">
          <label className="flex h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-superficie px-3 text-sm text-stone-600">
            <FileUp className="size-4 shrink-0" />
            <span className="truncate">{guia ? guia.name : "Adjuntar archivo"}</span>
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setGuia(e.target.files?.[0] ?? null)} />
          </label>
        </Campo>
      </Tarjeta>

      <Tarjeta className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-stone-700">Metales que salen (peso de nuestra balanza)</p>
          {disponibles.length > 0 && (
            <Select value="" onChange={(e) => e.target.value && agregar(e.target.value)} className="w-full sm:w-60">
              <option value="">+ Agregar metal…</option>
              {disponibles.map((m) => <option key={m.metal_id} value={m.metal_id}>{m.nombre} · {kg(m.kg)}</option>)}
            </Select>
          )}
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={confirmarYa} onChange={(e) => setConfirmarYa(e.target.checked)} className="size-4 accent-marca-600" />
          Ya tengo el pesaje y el precio del comprador (confirmar ahora)
        </label>

        {lineas.length === 0 && <p className="py-6 text-center text-sm text-stone-500">Agregue los metales que salen.</p>}
        <div className="space-y-3">
          {lineas.map((l) => {
            const m = metal(l.metal_id);
            const merma = aGramos(l.salida) - aGramos(l.recibido);
            return (
              <div key={l.uid} className="rounded-xl border border-stone-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold"><PuntoMetal color={m.color} />{m.nombre}</span>
                  <span className="flex items-center gap-2 text-xs text-stone-500">
                    Stock {kg(m.kg)}
                    <button type="button" onClick={() => setLineas((ls) => ls.filter((x) => x.uid !== l.uid))} className="rounded p-1 hover:bg-red-50 hover:text-red-600" aria-label="Quitar">
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Campo etiqueta="Salida (kg)">
                    <InputNumero value={l.salida} onChange={(e) => cambiar(l.uid, "salida", e.target.value)} placeholder="0.000" />
                  </Campo>
                  {confirmarYa && (
                    <>
                      <Campo etiqueta="Recibido (kg)">
                        <InputNumero value={l.recibido} onChange={(e) => cambiar(l.uid, "recibido", e.target.value)} placeholder="0.000" />
                      </Campo>
                      <Campo etiqueta="Precio S/ por kg">
                        <InputNumero value={l.precio} onChange={(e) => cambiar(l.uid, "precio", e.target.value)} />
                      </Campo>
                      <div className="rounded-lg bg-stone-50 px-3 py-2 text-right">
                        <p className="text-xs text-stone-500">Merma {gramosAKg(Math.max(merma, 0))} kg</p>
                        <p className="cifra font-semibold">S/ {centimosASoles(importeCentimos(aGramos(l.recibido), aCentimos(l.precio)))}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Tarjeta>

      {confirmarYa && (
        <Tarjeta className="grid gap-3 p-4 sm:grid-cols-2">
          <Campo etiqueta="Medio de cobro">
            <Select value={medio} onChange={(e) => setMedio(e.target.value as MedioPago)}>
              {(["transferencia", "efectivo", "yape", "plin"] as MedioPago[]).map((m) => <option key={m} value={m}>{ETIQUETA_MEDIO[m]}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Entra a la caja">
            <Select value={cajaId} onChange={(e) => setCajaId(e.target.value)}>
              {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </Campo>
        </Tarjeta>
      )}

      <Tarjeta className="p-4">
        <Campo etiqueta="Notas (opcional)">
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Campo>
      </Tarjeta>

      {error && <Aviso tono="rojo">{error}</Aviso>}

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-superficie p-3 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-stone-500">Salida {gramosAKg(totalSalida)} kg</p>
            <p className="cifra text-xl font-bold">{confirmarYa ? `S/ ${centimosASoles(totalImporte)}` : "Pendiente de pesaje"}</p>
          </div>
          <Boton tamano="lg" onClick={guardar} disabled={guardando || lineas.length === 0}>
            {guardando ? "Guardando…" : confirmarYa ? "Registrar y cobrar" : "Registrar salida"}
          </Boton>
        </div>
      </div>

      {lineas.length === 0 && disponibles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {disponibles.slice(0, 6).map((m) => (
            <button key={m.metal_id} type="button" onClick={() => agregar(m.metal_id)} className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-superficie px-3 py-1.5 text-sm">
              <Plus className="size-3.5" /> {m.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
