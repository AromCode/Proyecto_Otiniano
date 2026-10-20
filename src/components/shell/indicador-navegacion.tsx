"use client";

import { useLinkStatus } from "next/link";

/** Va dentro de un <Link>: muestra la barra fina de arriba mientras se abre esa sección */
export function IndicadorNavegacion() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden className="barra-navegacion" /> : null;
}
