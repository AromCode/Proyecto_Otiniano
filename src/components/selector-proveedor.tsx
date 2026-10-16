"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Search, UserRound, X } from "lucide-react";
import { buscarProveedores, crearProveedor } from "@/app/(app)/proveedores/acciones";
import { Modal } from "@/components/ui/modal";
import { claseInput, cx } from "@/components/ui/clases";
import { FormProveedor } from "@/components/form-proveedor";
import type { Proveedor } from "@/lib/tipos";

/** Busca proveedor por DNI/RUC o nombre; si no existe, lo crea en el mismo modal. */
export function SelectorProveedor({
  valor, onCambio,
}: { valor: Proveedor | null; onCambio: (p: Proveedor | null) => void }) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Proveedor[]>([]);
  const [buscando, iniciar] = useTransition();
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => iniciar(async () => setResultados(await buscarProveedores(q))), 250);
    return () => clearTimeout(t);
  }, [q]);

  if (valor) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-marca-200 bg-marca-50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserRound className="size-5 shrink-0 text-marca-700" />
          <div className="min-w-0">
            <p className="truncate font-medium">{valor.nombre}</p>
            <p className="text-xs text-stone-600">{valor.nro_doc ? `${valor.tipo_doc} ${valor.nro_doc}` : "Sin documento"}</p>
          </div>
        </div>
        <button type="button" onClick={() => onCambio(null)} className="rounded-md p-1.5 text-stone-500 hover:bg-superficie" aria-label="Quitar proveedor">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="DNI, RUC o nombre (opcional)"
            className={cx(claseInput, "pl-9")}
            inputMode="search"
          />
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-stone-300 bg-superficie px-3 text-sm font-medium hover:bg-stone-50"
        >
          <Plus className="size-4" /> Nuevo
        </button>
      </div>
      {q.trim().length >= 2 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-stone-200 bg-superficie shadow-lg">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => { onCambio(p); setQ(""); }}
                className="block w-full px-3 py-2 text-left hover:bg-stone-50"
              >
                <span className="block truncate text-sm font-medium">{p.nombre}</span>
                <span className="text-xs text-stone-500">{p.nro_doc ? `${p.tipo_doc} ${p.nro_doc}` : "Sin documento"}</span>
              </button>
            </li>
          ))}
          {!buscando && resultados.length === 0 && (
            <li className="px-3 py-2 text-sm text-stone-500">
              Sin resultados.{" "}
              <button type="button" className="font-medium text-marca-700" onClick={() => setModal(true)}>Registrar nuevo</button>
            </li>
          )}
        </ul>
      )}
      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo="Nuevo proveedor">
        <FormProveedor
          accion={crearProveedor}
          inicial={/^\d{8}$/.test(q.trim()) ? { tipo_doc: "DNI", nro_doc: q.trim() } : /^\d{11}$/.test(q.trim()) ? { tipo_doc: "RUC", nro_doc: q.trim() } : { nombre: q.trim() }}
          onExito={(p) => { onCambio(p as Proveedor); setModal(false); setQ(""); }}
        />
      </Modal>
    </div>
  );
}
