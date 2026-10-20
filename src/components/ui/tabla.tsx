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

// Ancho de la TARJETA (container query, no de la pantalla) desde el que cabe la tabla, según cuántas
// columnas tiene. Más angosta (celular, columna lateral, menú abierto en laptop): tarjetas apiladas,
// así nunca hay que desplazar de costado para ver el importe. Clases completas para que Tailwind las genere.
const CABE_TABLA = [
  { cols: 4, tabla: "hidden @lg:block", tarjetas: "@lg:hidden" },
  { cols: 5, tabla: "hidden @xl:block", tarjetas: "@xl:hidden" },
  { cols: 6, tabla: "hidden @2xl:block", tarjetas: "@2xl:hidden" },
  { cols: 7, tabla: "hidden @3xl:block", tarjetas: "@3xl:hidden" },
  { cols: 8, tabla: "hidden @4xl:block", tarjetas: "@4xl:hidden" },
  { cols: Infinity, tabla: "hidden @5xl:block", tarjetas: "@5xl:hidden" },
];

/** Clases de la tabla y de las tarjetas según cuántas columnas hay que hacer caber */
export const cabeTabla = (columnas: number) => CABE_TABLA.find((x) => columnas <= x.cols)!;

/**
 * Tabla cuando la tarjeta es ancha; tarjetas apiladas cuando no (sin scroll horizontal).
 */
export function TablaDatos<T>({
  filas, columnas, clave, enlace, vacio = "Sin registros", pie, pieTarjetas,
}: {
  filas: T[];
  columnas: Columna<T>[];
  clave: (f: T) => string;
  enlace?: (f: T) => string;
  vacio?: React.ReactNode;
  pie?: React.ReactNode;
  /** Equivalente de `pie` cuando se ven tarjetas (p. ej. el total) */
  pieTarjetas?: React.ReactNode;
}) {
  if (filas.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-stone-500">{vacio}</div>;
  }
  const alin = (a?: string) => (a === "der" ? "text-right" : a === "centro" ? "text-center" : "text-left");
  const principales = columnas.filter((c) => c.principal);
  const resto = columnas.filter((c) => !c.principal && !c.ocultarMovil);
  const cabe = cabeTabla(columnas.length);
  const borde = "first:pl-4 last:pr-4";

  return (
    <div className="@container">
      {/* Tarjeta ancha: tabla. overflow-x-auto solo como red de seguridad */}
      <div className={cx("overflow-x-auto", cabe.tabla)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              {columnas.map((c) => (
                <th key={c.titulo} className={cx("px-3 py-2.5 font-medium", borde, alin(c.alinear))}>{c.titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filas.map((f) => (
              <tr key={clave(f)} className={cx("hover:bg-stone-50", enlace && "cursor-pointer")}>
                {columnas.map((c, i) => (
                  <td key={c.titulo} className={cx("px-3 py-2.5 align-middle", borde, alin(c.alinear), c.className)}>
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

      {/* Tarjeta angosta: filas como tarjetas */}
      <ul className={cx("divide-y divide-stone-100", cabe.tarjetas)}>
        {filas.map((f) => {
          const contenido = (
            <>
              <div className="flex items-start justify-between gap-2">
                {principales.map((c) => (
                  <div key={c.titulo} className={cx("min-w-0 font-medium", alin(c.alinear))}>{c.celda(f)}</div>
                ))}
              </div>
              {resto.length > 0 && (
                <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm @xl:grid-cols-3 @3xl:grid-cols-4">
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
        {pieTarjetas && <li>{pieTarjetas}</li>}
      </ul>
    </div>
  );
}
