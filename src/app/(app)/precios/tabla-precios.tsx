"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Aviso, Insignia, PuntoMetal, Tarjeta } from "@/components/ui/basicos";
import { Boton } from "@/components/ui/boton";
import { InputNumero } from "@/components/ui/campos";
import { Modal } from "@/components/ui/modal";
import { soles } from "@/lib/formato";
import type { Metal } from "@/lib/tipos";
import { guardarPrecios } from "./acciones";
import { FormMetal } from "./form-metal";

export function TablaPrecios({ metales, editable }: { metales: Metal[]; editable: boolean }) {
  const router = useRouter();
  const [valores, setValores] = useState(() =>
    Object.fromEntries(metales.map((m) => [m.id, { c: m.precio_compra, v: m.precio_venta }])));
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [modal, setModal] = useState<Metal | "nuevo" | null>(null);

  const cambios = metales.filter((m) =>
    valores[m.id] && (Number(valores[m.id].c) !== Number(m.precio_compra) || Number(valores[m.id].v) !== Number(m.precio_venta)));

  async function guardar() {
    setGuardando(true);
    setEstado(null);
    const r = await guardarPrecios(cambios.map((m) => ({ id: m.id, precio_compra: valores[m.id].c, precio_venta: valores[m.id].v })));
    setGuardando(false);
    setEstado(r.ok ? { tipo: "ok", msg: "Precios actualizados." } : { tipo: "error", msg: r.error });
    if (r.ok) router.refresh();
  }

  return (
    <Tarjeta>
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold">Metales</h2>
        {editable && <Boton variante="secundario" tamano="sm" onClick={() => setModal("nuevo")}><Plus className="size-4" /> Metal</Boton>}
      </div>
      <ul className="divide-y divide-stone-100">
        <li className="hidden grid-cols-[1fr_8rem_8rem] gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wide text-stone-500 sm:grid">
          <span>Metal</span><span className="text-right">Compra S/ kg</span><span className="text-right">Venta S/ kg</span>
        </li>
        {metales.length === 0 && <li className="px-4 py-8 text-center text-sm text-stone-500">Agregue los metales que compra y vende.</li>}
        {metales.map((m) => (
          <li key={m.id} className="grid grid-cols-2 items-center gap-2 px-4 py-2.5 sm:grid-cols-[1fr_8rem_8rem] sm:gap-3">
            <button
              type="button"
              disabled={!editable}
              onClick={() => setModal(m)}
              className="col-span-2 flex items-center gap-2 text-left font-medium sm:col-span-1"
            >
              <PuntoMetal color={m.color} />
              <span className={m.activo ? "" : "text-stone-400"}>{m.nombre}</span>
              {!m.activo && <Insignia>Inactivo</Insignia>}
            </button>
            {editable && m.activo ? (
              <>
                <InputNumero aria-label={`Compra ${m.nombre}`} value={valores[m.id].c} onChange={(e) => setValores({ ...valores, [m.id]: { ...valores[m.id], c: e.target.value } })} />
                <InputNumero aria-label={`Venta ${m.nombre}`} value={valores[m.id].v} onChange={(e) => setValores({ ...valores, [m.id]: { ...valores[m.id], v: e.target.value } })} />
              </>
            ) : (
              <>
                <span className="cifra text-right">{soles(m.precio_compra)}</span>
                <span className="cifra text-right">{soles(m.precio_venta)}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-4 py-3">
          <div className="min-w-0 flex-1">
            {estado && <Aviso tono={estado.tipo === "ok" ? "verde" : "rojo"}>{estado.msg}</Aviso>}
            {!estado && <p className="text-sm text-stone-500">{cambios.length ? `${cambios.length} cambio(s) sin guardar` : "Sin cambios"}</p>}
          </div>
          <Boton onClick={guardar} disabled={guardando || cambios.length === 0}>{guardando ? "Guardando…" : "Guardar precios"}</Boton>
        </div>
      )}
      <Modal abierto={modal !== null} onCerrar={() => setModal(null)} titulo={modal === "nuevo" ? "Nuevo metal" : "Editar metal"}>
        {modal && <FormMetal metal={modal === "nuevo" ? null : modal} onListo={() => setModal(null)} />}
      </Modal>
    </Tarjeta>
  );
}
