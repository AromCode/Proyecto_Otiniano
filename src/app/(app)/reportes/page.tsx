import type { Metadata } from "next";
import { VistaReportes, type ParamsReporte } from "@/components/reportes/vista-reportes";

export const metadata: Metadata = { title: "Reportes" };

export default async function Page({ searchParams }: { searchParams: Promise<ParamsReporte> }) {
  return <VistaReportes sp={await searchParams} base="/reportes" />;
}
