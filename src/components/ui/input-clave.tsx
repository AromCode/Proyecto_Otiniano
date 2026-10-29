"use client";

import { useId, useState } from "react";
import { ArrowBigUp, Eye, EyeOff } from "lucide-react";
import { claseInput, cx } from "./clases";

/** Contraseña con botón para verla u ocultarla y aviso de mayúsculas activadas (dentro del campo: no cambia el alto). */
export function InputClave({ className, onKeyDown, onKeyUp, ...rest }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const idAviso = useId();
  const revisar = (e: React.KeyboardEvent<HTMLInputElement>) => setMayusculas(e.getModifierState?.("CapsLock") ?? false);
  return (
    <span className="relative block">
      <input
        type={visible ? "text" : "password"}
        className={cx(claseInput, mayusculas ? "pr-24" : "pr-11", className)}
        onKeyDown={(e) => { revisar(e); onKeyDown?.(e); }}
        onKeyUp={(e) => { revisar(e); onKeyUp?.(e); }}
        onBlur={() => setMayusculas(false)}
        aria-describedby={mayusculas ? idAviso : undefined}
        {...rest}
      />
      {mayusculas && (
        <span id={idAviso} role="status" title="Las mayúsculas están activadas"
          className="pointer-events-none absolute inset-y-0 right-11 my-auto flex h-6 items-center gap-0.5 rounded-md bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">
          <ArrowBigUp className="size-3.5" /> Mayús<span className="sr-only">: las mayúsculas están activadas</span>
        </span>
      )}
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-stone-500 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-500"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </span>
  );
}
