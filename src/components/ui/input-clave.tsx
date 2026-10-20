"use client";

import { useState } from "react";
import { ArrowBigUp, Eye, EyeOff } from "lucide-react";
import { claseInput, cx } from "./clases";

/** Contraseña con botón para verla u ocultarla y aviso de mayúsculas activadas. */
export function InputClave({ className, onKeyDown, onKeyUp, ...rest }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const revisar = (e: React.KeyboardEvent<HTMLInputElement>) => setMayusculas(e.getModifierState?.("CapsLock") ?? false);
  return (
    <>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          className={cx(claseInput, "pr-11", className)}
          onKeyDown={(e) => { revisar(e); onKeyDown?.(e); }}
          onKeyUp={(e) => { revisar(e); onKeyUp?.(e); }}
          onBlur={() => setMayusculas(false)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-stone-500 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-200"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </span>
      {mayusculas && (
        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
          <ArrowBigUp className="size-3.5" /> Las mayúsculas están activadas
        </span>
      )}
    </>
  );
}
