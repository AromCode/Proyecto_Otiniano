import type { Metadata } from "next";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { cargarMediosPago, cargarProductos } from "@/lib/productos";
import { Aviso } from "@/components/ui/basicos";
import { BotonLink } from "@/components/ui/boton";
import type { Caja, Proveedor } from "@/lib/tipos";
import { FormCompra, type PrecioRef } from "./form-compra";

export const metadata: Metadata = { title: "Comprar" };

export default async function ComprarPage() {
  const ctx = await exigir("comprar");
  const { supabase, empresa, rol } = ctx;
  const [productos, medios, { data: cajas }, { data: precios }, { data: proveedores }] = await Promise.all([
    cargarProductos(ctx),
    cargarMediosPago(ctx),
    supabase.from("cajas").select("*").eq("empresa_id", empresa.id).eq("activo", true).order("orden"),
    supabase.rpc("precios_promedio", { p_empresa: empresa.id }),
    supabase.from("proveedores").select("id, tipo_doc, nro_doc, nombre, telefono, direccion, activo, clase")
      .eq("empresa_id", empresa.id).eq("activo", true).order("nombre").limit(2000),
  ]);
  const verCostos = puede(rol, "verCostos");
  const referencias: Record<string, PrecioRef> = Object.fromEntries((precios ?? []).map((p: { metal_id: string; costo_promedio: number | null; compra_promedio: number | null }) => [p.metal_id, {
    costo_promedio: verCostos && p.costo_promedio != null ? Number(p.costo_promedio) : null,
    compra_promedio: p.compra_promedio != null ? Number(p.compra_promedio) : null,
  }]));

  if (!productos.length) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-10">
        <Aviso>Todavía no hay productos registrados. Administración debe crearlos y fijar el precio del día.</Aviso>
        <BotonLink href="/precios" variante="secundario">Ir a productos y precios</BotonLink>
      </div>
    );
  }

  return (
    <FormCompra
      empresaId={empresa.id}
      productos={productos}
      proveedores={(proveedores ?? []) as Proveedor[]}
      medios={medios}
      cajas={(cajas ?? []) as Caja[]}
      puedeEditarPrecio={empresa.roles_editan_precio.includes(rol)}
      montoDocObligatorio={empresa.monto_doc_obligatorio ? Number(empresa.monto_doc_obligatorio) : null}
      referencias={referencias}
      verCostos={verCostos}
    />
  );
}
