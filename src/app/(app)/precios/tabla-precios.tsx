"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Aviso, Insignia, PuntoMetal, Tarjeta } from "@/components/ui/basicos";
import { Boton } from "@/components/ui/boton";
import { InputNumero } from "@/components/ui/campos";
import { Modal } from "@/components/ui/modal";
import { soles } from "@/lib/formato";
import type { Producto } from "@/lib/tipos";
import { guardarPrecios } from "./acciones";
import { FormMetal } from "./form-metal";

type Valores = { c: string; m: string; v: string };

export function TablaPrecios({ productos, editable }: { productos: Producto[]; editable: boolean }) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, Valores>>(() =>
    Object.fromEntries(productos.map((p) => [p.id, { c: p.precio_compra, m: p.precio_mayorista ?? "", v: p.precio_venta }])));
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [modal, setModal] = useState<{ producto: Producto | null; padre: string | null } | null>(null);

  const distinto = (a: string | null, b: string) => (a ?? "").trim() === "" ? b.trim() !== "" : b.trim() === "" || Number(a) !== Number(b);
  const cambios = productos.filter((p) => valores[p.id] && (
    Number(valores[p.id].c) !== Number(p.precio_compra) || Number(valores[p.id].v) !== Number(p.precio_venta)
    || distinto(p.precio_mayorista, valores[p.id].m)));

  async function guardar() {
    setGuardando(true);
    setEstado(null);
    const r = await guardarPrecios(cambios.map((p) => ({ id: p.id, precio_compra: valores[p.id].c, precio_mayorista: valores[p.id].m, precio_venta: valores[p.id].v })));
    setGuardando(false);
    setEstado(r.ok ? { tipo: "ok", msg: "Precios actualizados." } : { tipo: "error", msg: r.error });
    if (r.ok) router.refresh();
  }
  const fijar = (id: string, campo: keyof Valores, v: string) => setValores((x) => ({ ...x, [id]: { ...x[id], [campo]: v } }));

  return (
    <Tarjeta>
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold">Productos</h2>
        {editable && <Boton variante="secundario" tamano="sm" onClick={() => setModal({ producto: null, padre: null })}><Plus className="size-4" /> Familia</Boton>}
      </div>
      <ul className="divide-y divide-stone-100">
        <li className="hidden grid-cols-[1fr_6.5rem_6.5rem_6.5rem] gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wide text-stone-500 sm:grid">
          <span>Producto</span><span className="text-right">Compra</span><span className="text-right">Mayorista</span><span className="text-right">Venta</span>
        </li>
        {productos.length === 0 && <li className="px-4 py-8 text-center text-sm text-stone-500">Cree las familias (Cobre, Aluminio, Fierro…) y dentro sus productos y variantes.</li>}
        {productos.map((p) => (
          <li key={p.id} className="grid grid-cols-3 items-center gap-2 px-4 py-2 sm:grid-cols-[1fr_6.5rem_6.5rem_6.5rem]">
            <div className="col-span-3 flex min-w-0 items-center gap-1.5 sm:col-span-1" style={{ paddingLeft: `${(p.nivel - 1) * 1.1}rem` }}>
              {p.nivel > 1 && <span className="text-stone-300">└</span>}
              <button type="button" disabled={!editable} onClick={() => setModal({ producto: p, padre: p.padre_id })}
                className="flex min-w-0 items-center gap-2 text-left">
                <PuntoMetal color={p.color} />
                <span className={`truncate ${p.nivel === 1 ? "font-semibold" : "font-medium"} ${p.activo ? "" : "text-stone-400"}`}>{p.nombre}</span>
              </button>
              {p.codigo && <span className="shrink-0 font-mono text-xs text-stone-500">{p.codigo}</span>}
              {!p.activo && <Insignia>Inactivo</Insignia>}
              {editable && p.activo && (
                <button type="button" onClick={() => setModal({ producto: null, padre: p.id })} title={`Agregar variante de ${p.nombre}`}
                  className="ml-auto shrink-0 rounded p-1 text-stone-400 hover:bg-marca-50 hover:text-marca-700" aria-label={`Agregar variante de ${p.nombre}`}>
                  <Plus className="size-4" />
                </button>
              )}
            </div>
            {editable && p.activo ? (
              <>
                <InputNumero aria-label={`Compra ${p.nombre}`} value={valores[p.id].c} onChange={(e) => fijar(p.id, "c", e.target.value)} />
                <InputNumero aria-label={`Mayorista ${p.nombre}`} value={valores[p.id].m} placeholder={valores[p.id].c} onChange={(e) => fijar(p.id, "m", e.target.value)} />
                <InputNumero aria-label={`Venta ${p.nombre}`} value={valores[p.id].v} onChange={(e) => fijar(p.id, "v", e.target.value)} />
              </>
            ) : (
              <>
                <span className="cifra text-right">{soles(p.precio_compra)}</span>
                <span className="cifra text-right">{p.precio_mayorista != null ? soles(p.precio_mayorista) : "—"}</span>
                <span className="cifra text-right">{soles(p.precio_venta)}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-4 py-3">
          <div className="min-w-0 flex-1">
            {estado && <Aviso tono={estado.tipo === "ok" ? "verde" : "rojo"}>{estado.msg}</Aviso>}
            {!estado && <p className="text-sm text-stone-500">{cambios.length ? `${cambios.length} cambio(s) sin guardar` : "Mayorista vacío = mismo precio que el minorista."}</p>}
          </div>
          <Boton onClick={guardar} disabled={guardando || cambios.length === 0}>{guardando ? "Guardando…" : "Guardar precios"}</Boton>
        </div>
      )}
      <Modal abierto={modal !== null} onCerrar={() => setModal(null)}
        titulo={modal?.producto ? "Editar producto" : modal?.padre ? "Nueva variante" : "Nueva familia"}>
        {modal && <FormMetal producto={modal.producto} padreId={modal.padre} productos={productos} onListo={() => setModal(null)} />}
      </Modal>
    </Tarjeta>
  );
}
