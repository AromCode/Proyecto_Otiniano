import { cx } from "@/components/ui/clases";

/** Qué tan segura es la contraseña: largo, mayúsculas/minúsculas, números y símbolos */
export function fuerzaClave(clave: string): { nivel: 0 | 1 | 2 | 3; texto: string } {
  if (!clave) return { nivel: 0, texto: "" };
  if (clave.length < 8) return { nivel: 1, texto: "Muy corta: use al menos 8 caracteres" };
  const variedad = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(clave)).length;
  if (clave.length >= 12 && variedad >= 3) return { nivel: 3, texto: "Segura" };
  return variedad >= 2 ? { nivel: 2, texto: "Aceptable: agregue números o símbolos para mejorarla" } : { nivel: 1, texto: "Débil: mezcle letras, números y símbolos" };
}

/** Barra de tres tramos bajo el campo de nueva contraseña */
export function MedidorClave({ clave }: { clave: string }) {
  const f = fuerzaClave(clave);
  if (f.nivel === 0) return null;
  return (
    <div aria-live="polite">
      <div className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map((n) => (
          <span key={n} className={cx("h-1.5 rounded-full transition-colors", n <= f.nivel
            ? f.nivel === 1 ? "bg-red-500" : f.nivel === 2 ? "bg-amber-500" : "bg-emerald-500"
            : "bg-stone-200")} />
        ))}
      </div>
      <p className="mt-1 text-xs text-stone-500">{f.texto}</p>
    </div>
  );
}
