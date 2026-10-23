import type { Metadata } from "next";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { cargarMediosPago } from "@/lib/productos";
import { Aviso } from "@/components/ui/basicos";
import { BotonLink } from "@/components/ui/boton";
import type { Caja, Comprador } from "@/lib/tipos";
import { FormVenta, type MetalConStock } from "./form-venta";

export const metadata: Metadata = { title: "Vender" };

export default async function VenderPage() {
  const ctx = await exigir("vender");
  const { supabase, empresa, rol } = ctx;
  const [{ data: stock }, { data: compradores }, { data: cajas }, { data: precios }, medios] = await Promise.all([
    supabase.from("v_stock_metal").select("metal_id, nombre, ruta, nivel, clave_orden, color, kg, costo_promedio, precio_venta")
      .eq("empresa_id", empresa.id).eq("activo", true).gt("kg", 0).order("clave_orden"),
    supabase.from("compradores").select("*").eq("empresa_id", empresa.id).eq("activo", true).order("razon_social"),
    supabase.from("cajas").select("*").eq("empresa_id", empresa.id).eq("activo", true).order("orden"),
    supabase.rpc("precios_promedio", { p_empresa: empresa.id }),
    cargarMediosPago(ctx),
  ]);
  const verCostos = puede(rol, "verCostos");
  const ventaProm = new Map((precios ?? []).map((p: { metal_id: string; venta_promedio: number | null }) => [p.metal_id, p.venta_promedio]));
  // El costo solo viaja al navegador si el rol puede verlo
  const metales: MetalConStock[] = (stock ?? []).map((s) => ({
    ...s, costo_promedio: verCostos ? s.costo_promedio : null, venta_promedio: ventaProm.get(s.metal_id) != null ? Number(ventaProm.get(s.metal_id)) : null,
  })) as MetalConStock[];

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
      metales={metales}
      verCostos={verCostos}
      compradores={compradores as Comprador[]}
      cajas={(cajas ?? []) as Caja[]}
      medios={medios}
    />
  );
}
