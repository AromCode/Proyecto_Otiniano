"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search, UserRound, X } from "lucide-react";
import { crearProveedor } from "@/app/(app)/proveedores/acciones";
import { Insignia } from "@/components/ui/basicos";
import { Modal } from "@/components/ui/modal";
import { claseInput, cx } from "@/components/ui/clases";
import { FormProveedor } from "@/components/form-proveedor";
import { ETIQUETA_CLASE } from "@/lib/formato";
import type { Proveedor } from "@/lib/tipos";

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Lista desplegable con todos los proveedores que se filtra al escribir las primeras letras del
 * nombre (o el DNI/RUC, que pocas veces se recuerda). Si no existe, se registra en el mismo modal.
 */
export function SelectorProveedor({
  valor, onCambio, proveedores,
}: { valor: Proveedor | null; onCambio: (p: Proveedor | null) => void; proveedores: Proveedor[] }) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [modal, setModal] = useState(false);
  const [nuevos, setNuevos] = useState<Proveedor[]>([]);
  const caja = useRef<HTMLDivElement>(null);

  const todos = useMemo(() => [...nuevos, ...proveedores], [nuevos, proveedores]);
  const texto = normal(q.trim());
  const filtrados = useMemo(() => {
    if (!texto) return todos;
    const digitos = /^\d+$/.test(texto);
    // Primero los que empiezan con lo escrito (nombre o cualquier palabra), luego los que lo contienen
    const empieza = todos.filter((p) => digitos ? (p.nro_doc ?? "").startsWith(texto)
      : normal(p.nombre).startsWith(texto) || normal(p.nombre).split(/\s+/).some((w) => w.startsWith(texto)));
    const contiene = digitos ? [] : todos.filter((p) => !empieza.includes(p) && normal(p.nombre).includes(texto));
    return [...empieza, ...contiene];
  }, [todos, texto]);

  if (valor) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-marca-200 bg-marca-50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserRound className="size-5 shrink-0 text-marca-700" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium">
              {valor.nombre}
              <Insignia tono={valor.clase === "mayorista" ? "azul" : "gris"}>{ETIQUETA_CLASE[valor.clase] ?? "Minorista"}</Insignia>
            </p>
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
    <div
      className="relative"
      ref={caja}
      onBlur={(e) => { if (!caja.current?.contains(e.relatedTarget as Node)) setAbierto(false); }}
    >
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-stone-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtrados[0]) { e.preventDefault(); onCambio(filtrados[0]); setQ(""); setAbierto(false); }
              if (e.key === "Escape") setAbierto(false);
            }}
            placeholder="Escriba el nombre o elija de la lista"
            className={cx(claseInput, "pl-9 pr-9")}
            role="combobox"
            aria-expanded={abierto}
            aria-controls="lista-proveedores"
          />
          <button type="button" tabIndex={-1} onClick={() => setAbierto((a) => !a)} aria-label="Ver todos"
            className="absolute right-2 top-2 rounded p-1 text-stone-400 hover:text-stone-700">
            <ChevronDown className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-stone-300 bg-superficie px-3 text-sm font-medium hover:bg-stone-50"
        >
          <Plus className="size-4" /> Nuevo
        </button>
      </div>
      {abierto && (
        <ul id="lista-proveedores" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-stone-200 bg-superficie shadow-lg">
          {filtrados.slice(0, 100).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => { onCambio(p); setQ(""); setAbierto(false); }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-stone-50 focus:bg-stone-50 focus:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.nombre}</span>
                  <span className="text-xs text-stone-500">{p.nro_doc ? `${p.tipo_doc} ${p.nro_doc}` : "Sin documento"}</span>
                </span>
                {p.clase === "mayorista" && <Insignia tono="azul">Mayorista</Insignia>}
              </button>
            </li>
          ))}
          {filtrados.length === 0 && (
            <li className="px-3 py-2 text-sm text-stone-500">
              {todos.length === 0 ? "Aún no hay proveedores." : "Sin resultados."}{" "}
              <button type="button" className="font-medium text-marca-700" onClick={() => setModal(true)}>Registrar nuevo</button>
            </li>
          )}
        </ul>
      )}
      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo="Nuevo proveedor">
        <FormProveedor
          accion={crearProveedor}
          inicial={/^\d{8}$/.test(q.trim()) ? { tipo_doc: "DNI", nro_doc: q.trim() } : /^\d{11}$/.test(q.trim()) ? { tipo_doc: "RUC", nro_doc: q.trim() } : { nombre: q.trim() }}
          onExito={(p) => { setNuevos((n) => [p as Proveedor, ...n]); onCambio(p as Proveedor); setModal(false); setQ(""); setAbierto(false); }}
        />
      </Modal>
    </div>
  );
}
