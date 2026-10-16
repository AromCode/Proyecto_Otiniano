import type { Metadata } from "next";
import { exigir } from "@/lib/contexto";
import { Aviso } from "@/components/ui/basicos";
import { BotonLink } from "@/components/ui/boton";
import type { Caja, Comprador } from "@/lib/tipos";
import { FormVenta, type MetalConStock } from "./form-venta";

export const metadata: Metadata = { title: "Vender" };

export default async function VenderPage() {
  const { supabase, empresa } = await exigir("vender");
  const [{ data: stock }, { data: compradores }, { data: cajas }] = await Promise.all([
    supabase.from("v_stock_metal").select("metal_id, nombre, color, kg, costo_promedio, precio_venta")
      .eq("empresa_id", empresa.id).eq("activo", true).gt("kg", 0).order("orden").order("nombre"),
    supabase.from("compradores").select("*").eq("empresa_id", empresa.id).eq("activo", true).order("razon_social"),
    supabase.from("cajas").select("*").eq("empresa_id", empresa.id).eq("activo", true).order("orden"),
  ]);

  if (!compradores?.length) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-10">
        <Aviso>Registre primero al menos un comprador (con RUC).</Aviso>
        <BotonLink href="/compradores" variante="secundario">Ir a compradores</BotonLink>
      </div>
    );
  }
  if (!stock?.length) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Aviso>No hay stock disponible para vender.</Aviso>
      </div>
    );
  }

  return (
    <FormVenta
      empresaId={empresa.id}
      metales={stock as MetalConStock[]}
      compradores={compradores as Comprador[]}
      cajas={(cajas ?? []) as Caja[]}
    />
  );
}
