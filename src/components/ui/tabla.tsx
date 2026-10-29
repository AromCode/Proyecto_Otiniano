import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
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
 * Estilo: cabecera y totales en azul de marca suave, filas en cebra, hover azul; las columnas
 * alineadas a la derecha son cifras (números tabulares) sin que cada página lo indique.
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
    return (
      <div className="flex flex-col items-center px-4 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-marca-50 text-marca-600">
          <Inbox className="size-5" />
        </span>
        <div className="mt-3 text-sm font-medium text-stone-700">{vacio}</div>
      </div>
    );
  }
  const alin = (a?: string) => (a === "der" ? "text-right" : a === "centro" ? "text-center" : "text-left");
  const celda = (a?: string) => cx(alin(a), a === "der" && "cifra");
  const principales = columnas.filter((c) => c.principal);
  const resto = columnas.filter((c) => !c.principal && !c.ocultarMovil);
  const cabe = cabeTabla(columnas.length);
  const borde = "first:pl-4 last:pr-4";

  return (
    // overflow-hidden + radios: la cabecera tintada no asoma por las esquinas redondeadas de la tarjeta
    <div className="@container overflow-hidden rounded-b-xl first:rounded-t-xl">
      {/* Tarjeta ancha: tabla. overflow-x-auto solo como red de seguridad */}
      <div className={cx("overflow-x-auto", cabe.tabla)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-marca-100 bg-marca-50 text-[11px] uppercase tracking-wider text-marca-800">
              {columnas.map((c) => (
                <th key={c.titulo} className={cx("px-3 py-2.5 font-semibold", borde, alin(c.alinear))}>{c.titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filas.map((f) => (
              <tr key={clave(f)} className={cx("transition-colors even:bg-stone-50/70 hover:bg-marca-50", enlace && "cursor-pointer")}>
                {columnas.map((c, i) => (
                  <td key={c.titulo} className={cx("px-3 py-2.5 align-middle", borde, celda(c.alinear), c.className)}>
                    {enlace && i === 0 ? (
                      <Link href={enlace(f)} className="font-medium text-marca-700 hover:underline">{c.celda(f)}</Link>
                    ) : c.celda(f)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {pie && <tfoot className="border-t-2 border-marca-200 bg-marca-50 font-semibold text-marca-800">{pie}</tfoot>}
        </table>
      </div>

      {/* Tarjeta angosta: filas como tarjetas */}
      <ul className={cx("divide-y divide-stone-100", cabe.tarjetas)}>
        {filas.map((f) => {
          const contenido = (
            <>
              <div className="flex items-start justify-between gap-2">
                {principales.map((c) => (
                  <div key={c.titulo} className={cx("min-w-0 font-medium", celda(c.alinear))}>{c.celda(f)}</div>
                ))}
              </div>
              {resto.length > 0 && (
                <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm @xl:grid-cols-3 @3xl:grid-cols-4">
                  {resto.map((c) => (
                    <div key={c.titulo} className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-stone-500">{c.titulo}</dt>
                      <dd className="truncate">{c.celda(f)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          );
          return (
            <li key={clave(f)} className="even:bg-stone-50/70">
              {enlace ? (
                <Link href={enlace(f)} className="flex items-center gap-2 px-4 py-3 transition-colors hover:bg-marca-50 active:bg-marca-50">
                  <div className="min-w-0 flex-1">{contenido}</div>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-stone-400" />
                </Link>
              ) : (
                <div className="px-4 py-3">{contenido}</div>
              )}
            </li>
          );
        })}
        {pieTarjetas && <li className="border-t-2 border-marca-200 bg-marca-50 font-semibold text-marca-800">{pieTarjetas}</li>}
      </ul>
    </div>
  );
}
