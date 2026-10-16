import type { Metadata } from "next";
import { VistaReportes, type ParamsReporte } from "@/components/reportes/vista-reportes";

export const metadata: Metadata = { title: "Reportes de caja" };

export default async function Page({ searchParams }: { searchParams: Promise<ParamsReporte> }) {
  return <VistaReportes sp={await searchParams} base="/caja/reportes" ids={["caja", "resultados", "patrimonio"]} titulo="Reportes de caja y finanzas" descripcion="Libro de caja, estado de resultados y patrimonio" />;
}
