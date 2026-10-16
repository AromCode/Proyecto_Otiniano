import type { Metadata } from "next";
import { VistaReportes, type ParamsReporte } from "@/components/reportes/vista-reportes";

export const metadata: Metadata = { title: "Reportes de ventas" };

export default async function Page({ searchParams }: { searchParams: Promise<ParamsReporte> }) {
  return <VistaReportes sp={await searchParams} base="/ventas/reportes" ids={["ventas", "margen", "merma"]} titulo="Reportes de ventas" descripcion="Cuánto vendimos, cuánto ganamos y cuánta merma hubo" />;
}
