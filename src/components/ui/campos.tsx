import { claseInput, cx } from "./clases";

export function Campo({
  etiqueta, ayuda, error, children, className,
}: { etiqueta: string; ayuda?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx("block min-w-0", className)}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{etiqueta}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span>
        : ayuda ? <span className="mt-1 block text-xs text-stone-500">{ayuda}</span> : null}
    </label>
  );
}

export function Input({ className, ...rest }: React.ComponentProps<"input">) {
  return <input className={cx(claseInput, className)} {...rest} />;
}

/** Input para kilos/soles: teclado numérico en celular y acepta coma o punto. */
export function InputNumero({ className, ...rest }: React.ComponentProps<"input">) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      pattern="[0-9]*[.,]?[0-9]*"
      className={cx(claseInput, "cifra text-right", className)}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: React.ComponentProps<"select">) {
  return (
    <select className={cx(claseInput, "pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: React.ComponentProps<"textarea">) {
  return <textarea rows={2} className={cx(claseInput, className)} {...rest} />;
}
