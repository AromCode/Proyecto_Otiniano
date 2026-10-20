import type { Metadata } from "next";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { Aviso } from "@/components/ui/basicos";
import { BotonLink } from "@/components/ui/boton";
import type { Caja, Metal } from "@/lib/tipos";
import { FormCompra, type PrecioRef } from "./form-compra";

export const metadata: Metadata = { title: "Comprar" };

export default async function ComprarPage() {
  const { supabase, empresa, rol } = await exigir("comprar");
  const [{ data: metales }, { data: cajas }, { data: precios }] = await Promise.all([
    supabase.from("metales").select("*").eq("empresa_id", empresa.id).eq("activo", true).order("orden").order("nombre"),
    supabase.from("cajas").select("*").eq("empresa_id", empresa.id).eq("activo", true).order("orden"),
    supabase.rpc("precios_promedio", { p_empresa: empresa.id }),
  ]);
  const verCostos = puede(rol, "verTodo");
  const referencias: Record<string, PrecioRef> = Object.fromEntries((precios ?? []).map((p: { metal_id: string; costo_promedio: number | null; compra_promedio: number | null }) => [p.metal_id, {
    costo_promedio: verCostos && p.costo_promedio != null ? Number(p.costo_promedio) : null,
    compra_promedio: p.compra_promedio != null ? Number(p.compra_promedio) : null,
  }]));

  if (!metales?.length) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-10">
        <Aviso>Todavía no hay metales registrados. El dueño debe crearlos y fijar el precio del día.</Aviso>
        <BotonLink href="/precios" variante="secundario">Ir a precios del día</BotonLink>
      </div>
    );
  }

  return (
    <FormCompra
      empresaId={empresa.id}
      metales={metales as Metal[]}
      cajas={(cajas ?? []) as Caja[]}
      puedeEditarPrecio={empresa.roles_editan_precio.includes(rol)}
      montoDocObligatorio={empresa.monto_doc_obligatorio ? Number(empresa.monto_doc_obligatorio) : null}
      referencias={referencias}
      verCostos={verCostos}
    />
  );
}
