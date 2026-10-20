"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Diálogo nativo: en celular ocupa el ancho y se ancla abajo; en escritorio queda centrado. */
export function Modal({
  abierto, onCerrar, titulo, children, ancho = "max-w-lg",
}: { abierto: boolean; onCerrar: () => void; titulo: string; children: React.ReactNode; ancho?: string }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => { if (e.target === ref.current) onCerrar(); }}
      className={`m-0 mt-auto w-full ${ancho} max-h-[92dvh] rounded-t-2xl bg-superficie p-0 shadow-xl sm:m-auto sm:rounded-2xl`}
    >
      {abierto && (
        <div className="flex max-h-[92dvh] flex-col text-left font-normal">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h2 className="font-semibold">{titulo}</h2>
            <button type="button" onClick={onCerrar} className="rounded-md p-1 text-stone-500 hover:bg-stone-100" aria-label="Cerrar">
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto p-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
