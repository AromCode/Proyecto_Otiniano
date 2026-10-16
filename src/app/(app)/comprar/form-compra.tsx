"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, FileText, Plus, Share2, Trash2 } from "lucide-react";
import { SelectorProveedor } from "@/components/selector-proveedor";
import { Campo, InputNumero, Select, Textarea } from "@/components/ui/campos";
import { Aviso, PuntoMetal, Tarjeta } from "@/components/ui/basicos";
import { Boton } from "@/components/ui/boton";
import { cx } from "@/components/ui/clases";
import { aCentimos, aGramos, centimosASoles, gramosAKg, importeCentimos, normalizar } from "@/lib/montos";
import { ETIQUETA_MEDIO, soles } from "@/lib/formato";
import { subirArchivo } from "@/lib/archivos";
import type { Caja, MedioPago, Metal, Proveedor } from "@/lib/tipos";
import { registrarCompra } from "../compras/acciones";

interface Linea {
  uid: string;
  metal_id: string;
  bruto: string;
  descuento: string;
  precio: string;
}

const MEDIOS: MedioPago[] = ["efectivo", "yape", "plin", "transferencia"];
const TIPO_CAJA: Record<MedioPago, Caja["tipo"]> = {
  efectivo: "efectivo", yape: "billetera", plin: "billetera", transferencia: "banco",
};

export function FormCompra({
  empresaId, metales, cajas, puedeEditarPrecio, montoDocObligatorio,
}: {
  empresaId: string;
  metales: Metal[];
  cajas: Caja[];
  puedeEditarPrecio: boolean;
  montoDocObligatorio: number | null;
}) {
  const [clave, setClave] = useState(() => crypto.randomUUID());
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [medio, setMedio] = useState<MedioPago>("efectivo");
  const [cajaId, setCajaId] = useState(() => cajas.find((c) => c.tipo === "efectivo")?.id ?? cajas[0]?.id ?? "");
  const [notas, setNotas] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState<{ id: string; numero: number; total: number } | null>(null);

  const metalPorId = useMemo(() => new Map(metales.map((m) => [m.id, m])), [metales]);

  const calculo = lineas.map((l) => {
    const neto = Math.max(0, aGramos(l.bruto) - aGramos(l.descuento));
    return { neto, importe: importeCentimos(neto, aCentimos(l.precio)) };
  });
  const totalCent = calculo.reduce((s, c) => s + c.importe, 0);
  const totalKg = calculo.reduce((s, c) => s + c.neto, 0);
  const requiereDoc = montoDocObligatorio !== null && totalCent >= montoDocObligatorio * 100
    && (!proveedor || proveedor.tipo_doc === "SIN_DOC");

  function agregar(metal: Metal) {
    setLineas((ls) => [...ls, { uid: crypto.randomUUID(), metal_id: metal.id, bruto: "", descuento: "", precio: metal.precio_compra }]);
    setTimeout(() => document.getElementById(`bruto-${lineas.length}`)?.focus(), 50);
  }
  function cambiar(uid: string, campo: keyof Linea, valor: string) {
    setLineas((ls) => ls.map((l) => (l.uid === uid ? { ...l, [campo]: valor } : l)));
  }
  function elegirMedio(m: MedioPago) {
    setMedio(m);
    const caja = cajas.find((c) => c.tipo === TIPO_CAJA[m]);
    if (caja) setCajaId(caja.id);
  }

  async function guardar() {
    setError(null);
    if (lineas.length === 0) return setError("Agregue al menos un metal.");
    if (calculo.some((c) => c.neto <= 0)) return setError("Revise los pesos: el neto de cada línea debe ser mayor a cero.");
    if (requiereDoc) return setError(`Para compras desde S/ ${montoDocObligatorio} se requiere el DNI o RUC del proveedor.`);
    setGuardando(true);
    try {
      const rutaFoto = foto ? await subirArchivo(empresaId, "tickets", foto) : null;
      const r = await registrarCompra({
        clave,
        proveedor_id: proveedor?.id ?? null,
        caja_id: cajaId,
        medio_pago: medio,
        notas: notas.trim() || null,
        foto_ticket_url: rutaFoto,
        items: lineas.map((l) => ({
          metal_id: l.metal_id,
          peso_bruto_kg: normalizar(l.bruto),
          descuento_kg: normalizar(l.descuento) || "0",
          precio_kg: normalizar(l.precio),
        })),
      });
      if (!r.ok) setError(r.error);
      else setHecho(r.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  function nueva() {
    setClave(crypto.randomUUID());
    setProveedor(null);
    setLineas([]);
    setNotas("");
    setFoto(null);
    setHecho(null);
    elegirMedio("efectivo");
    window.scrollTo({ top: 0 });
  }

  if (hecho) return <CompraHecha compra={hecho} onNueva={nueva} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Nueva compra</h1>
        <Link href="/compras" className="text-sm text-marca-700 hover:underline">Ver compras</Link>
      </div>

      <Tarjeta className="p-4">
        <p className="mb-2 text-sm font-medium text-stone-700">¿Quién vende?</p>
        <SelectorProveedor valor={proveedor} onCambio={setProveedor} />
        {!proveedor && <p className="mt-1.5 text-xs text-stone-500">Sin elegir, se registra como «Sin documento».</p>}
      </Tarjeta>

      <Tarjeta className="p-4">
        <p className="mb-2 text-sm font-medium text-stone-700">Toque el metal para agregarlo</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metales.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => agregar(m)}
              className="flex min-h-14 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-left active:scale-[0.98] active:bg-marca-50"
            >
              <PuntoMetal color={m.color} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{m.nombre}</span>
                <span className="cifra block text-xs text-stone-500">{soles(m.precio_compra)}/kg</span>
              </span>
            </button>
          ))}
        </div>
      </Tarjeta>

      {lineas.map((l, i) => {
        const m = metalPorId.get(l.metal_id)!;
        const c = calculo[i];
        return (
          <Tarjeta key={l.uid} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <PuntoMetal color={m.color} /> {m.nombre}
              </div>
              <button
                type="button"
                onClick={() => setLineas((ls) => ls.filter((x) => x.uid !== l.uid))}
                className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Quitar línea"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Campo etiqueta="Peso bruto (kg)">
                <InputNumero id={`bruto-${i}`} value={l.bruto} onChange={(e) => cambiar(l.uid, "bruto", e.target.value)} placeholder="0.000" />
              </Campo>
              <Campo etiqueta="Descuento (kg)" ayuda="Tierra, humedad…">
                <InputNumero value={l.descuento} onChange={(e) => cambiar(l.uid, "descuento", e.target.value)} placeholder="0.000" />
              </Campo>
              <Campo etiqueta="Precio S/ por kg">
                <InputNumero
                  value={l.precio}
                  onChange={(e) => cambiar(l.uid, "precio", e.target.value)}
                  readOnly={!puedeEditarPrecio}
                  className={cx(!puedeEditarPrecio && "bg-stone-100")}
                />
              </Campo>
              <div className="rounded-lg bg-stone-50 px-3 py-2 text-right">
                <p className="text-xs text-stone-500">Neto {gramosAKg(c.neto)} kg</p>
                <p className="cifra text-lg font-semibold">S/ {centimosASoles(c.importe)}</p>
              </div>
            </div>
          </Tarjeta>
        );
      })}

      {lineas.length > 0 && (
        <Tarjeta className="space-y-4 p-4">
          <div>
            <p className="mb-2 text-sm font-medium text-stone-700">Medio de pago</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MEDIOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => elegirMedio(m)}
                  className={cx(
                    "rounded-lg border px-1 py-2 text-xs font-medium sm:text-sm",
                    medio === m ? "border-marca-600 bg-marca-50 text-marca-700" : "border-stone-200 bg-superficie text-stone-700",
                  )}
                >
                  {ETIQUETA_MEDIO[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Sale de la caja">
              <Select value={cajaId} onChange={(e) => setCajaId(e.target.value)}>
                {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Foto del ticket de balanza (opcional)">
              <label className="flex h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-superficie px-3 text-sm text-stone-600">
                <Camera className="size-4 shrink-0" />
                <span className="truncate">{foto ? foto.name : "Tomar o elegir foto"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                />
              </label>
            </Campo>
          </div>
          <Campo etiqueta="Notas (opcional)">
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
          </Campo>
        </Tarjeta>
      )}

      {error && <Aviso tono="rojo">{error}</Aviso>}
      {requiereDoc && !error && (
        <Aviso>Para compras desde S/ {montoDocObligatorio} se requiere el DNI o RUC del proveedor.</Aviso>
      )}

      {/* Total fijo abajo, siempre visible */}
      <div className="sticky bottom-20 z-10 md:bottom-4">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-superficie p-3 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-stone-500">{gramosAKg(totalKg)} kg · {lineas.length} línea(s)</p>
            <p className="cifra text-2xl font-bold">S/ {centimosASoles(totalCent)}</p>
          </div>
          <Boton tamano="lg" onClick={guardar} disabled={guardando || lineas.length === 0}>
            {guardando ? "Guardando…" : "Pagar y guardar"}
          </Boton>
        </div>
      </div>
    </div>
  );
}

function CompraHecha({ compra, onNueva }: { compra: { id: string; numero: number; total: number }; onNueva: () => void }) {
  const urlTicket = `/compras/${compra.id}/ticket`;

  async function compartir() {
    const texto = `Compra N° ${compra.numero} · Total ${soles(compra.total)}`;
    try {
      const blob = await fetch(urlTicket).then((r) => r.blob());
      const archivo = new File([blob], `compra-${compra.numero}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: `Compra N° ${compra.numero}`, text: texto });
        return;
      }
    } catch {
      /* cae al enlace de WhatsApp */
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div className="mx-auto max-w-md py-6 text-center">
      <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
      <h1 className="mt-3 text-xl font-semibold">Compra N° {compra.numero} registrada</h1>
      <p className="cifra mt-1 text-3xl font-bold">{soles(compra.total)}</p>
      <p className="mt-1 text-sm text-stone-500">Se descontó de caja y se sumó al stock.</p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <a href={urlTicket} target="_blank" className="flex h-12 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-superficie font-medium">
          <FileText className="size-4" /> Ticket
        </a>
        <button onClick={compartir} className="flex h-12 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-superficie font-medium">
          <Share2 className="size-4" /> Compartir
        </button>
      </div>
      <Boton tamano="lg" className="mt-3 w-full" onClick={onNueva}>
        <Plus className="size-5" /> Nueva compra
      </Boton>
      <Link href={`/compras/${compra.id}`} className="mt-3 inline-block text-sm text-marca-700 hover:underline">Ver detalle</Link>
    </div>
  );
}
