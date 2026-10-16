import Link from "next/link";
import { cx } from "./clases";

export interface Columna<T> {
  titulo: string;
  celda: (fila: T) => React.ReactNode;
  alinear?: "izq" | "der" | "centro";
  /** En celular, va como título de la tarjeta */
  principal?: boolean;
  /** No se muestra en la tarjeta de celular */
  ocultarMovil?: boolean;
  className?: string;
}

/**
 * Tabla en escritorio, tarjetas apiladas en celular (sin scroll horizontal de la página).
 */
export function TablaDatos<T>({
  filas, columnas, clave, enlace, vacio = "Sin registros", pie,
}: {
  filas: T[];
  columnas: Columna<T>[];
  clave: (f: T) => string;
  enlace?: (f: T) => string;
  vacio?: React.ReactNode;
  pie?: React.ReactNode;
}) {
  if (filas.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-stone-500">{vacio}</div>;
  }
  const alin = (a?: string) => (a === "der" ? "text-right" : a === "centro" ? "text-center" : "text-left");
  const principales = columnas.filter((c) => c.principal);
  const resto = columnas.filter((c) => !c.principal && !c.ocultarMovil);

  return (
    <>
      {/* Escritorio */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              {columnas.map((c) => (
                <th key={c.titulo} className={cx("px-4 py-2.5 font-medium", alin(c.alinear))}>{c.titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filas.map((f) => (
              <tr key={clave(f)} className={cx("hover:bg-stone-50", enlace && "cursor-pointer")}>
                {columnas.map((c, i) => (
                  <td key={c.titulo} className={cx("px-4 py-2.5 align-middle", alin(c.alinear), c.className)}>
                    {enlace && i === 0 ? (
                      <Link href={enlace(f)} className="font-medium text-marca-700 hover:underline">{c.celda(f)}</Link>
                    ) : c.celda(f)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {pie && <tfoot className="border-t-2 border-stone-200 bg-stone-50 font-semibold">{pie}</tfoot>}
        </table>
      </div>

      {/* Celular */}
      <ul className="divide-y divide-stone-100 md:hidden">
        {filas.map((f) => {
          const contenido = (
            <>
              <div className="flex items-start justify-between gap-2">
                {principales.map((c) => (
                  <div key={c.titulo} className={cx("min-w-0 font-medium", alin(c.alinear))}>{c.celda(f)}</div>
                ))}
              </div>
              {resto.length > 0 && (
                <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {resto.map((c) => (
                    <div key={c.titulo} className="min-w-0">
                      <dt className="text-xs text-stone-500">{c.titulo}</dt>
                      <dd className="truncate">{c.celda(f)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          );
          return (
            <li key={clave(f)}>
              {enlace ? (
                <Link href={enlace(f)} className="block px-4 py-3 active:bg-stone-50">{contenido}</Link>
              ) : (
                <div className="px-4 py-3">{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
