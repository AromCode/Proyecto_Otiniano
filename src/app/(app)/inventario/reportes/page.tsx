import type { Metadata } from "next";
import { VistaReportes, type ParamsReporte } from "@/components/reportes/vista-reportes";

export const metadata: Metadata = { title: "Reportes de inventario" };

export default async function Page({ searchParams }: { searchParams: Promise<ParamsReporte> }) {
  return <VistaReportes sp={await searchParams} base="/inventario/reportes" ids={["kardex", "merma"]} titulo="Reportes de inventario" descripcion="Entradas y salidas por metal, y diferencias de peso" />;
}
