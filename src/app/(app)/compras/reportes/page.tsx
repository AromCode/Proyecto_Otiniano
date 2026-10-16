import type { Metadata } from "next";
import { VistaReportes, type ParamsReporte } from "@/components/reportes/vista-reportes";

export const metadata: Metadata = { title: "Reportes de compras" };

export default async function Page({ searchParams }: { searchParams: Promise<ParamsReporte> }) {
  return <VistaReportes sp={await searchParams} base="/compras/reportes" ids={["compras", "ranking"]} titulo="Reportes de compras" descripcion="Cuánto compramos y a quién" />;
}
