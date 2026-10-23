import type { Metadata } from "next";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { cargarProductos } from "@/lib/productos";
import { fechaHora, soles } from "@/lib/formato";
import { Encabezado, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { TablaPrecios } from "./tabla-precios";

export const metadata: Metadata = { title: "Productos y precios" };

export default async function PreciosPage() {
  const ctx = await obtenerContexto();
  const { supabase, empresa, rol } = ctx;
  const editable = puede(rol, "editarPrecios");
  const [productos, { data: historico }] = await Promise.all([
    cargarProductos(ctx, false),
    supabase.from("precios_metal").select("id, fecha, precio_compra, precio_mayorista, precio_venta, metal:metales(nombre)")
      .eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(60),
  ]);

  return (
    <>
      <Encabezado
        titulo="Productos y precios"
        descripcion={editable
          ? "Familia → producto → variante: cada nivel tiene su código, su precio y su stock. Cada cambio de precio queda en el histórico."
          : "Precios vigentes de compra (minorista y mayorista) y de venta por kg."}
      />
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">
          <TablaPrecios
            // Se remonta cuando cambian los datos guardados, para no quedar con valores viejos
            key={productos.map((m) => `${m.id}:${m.precio_compra}:${m.precio_mayorista}:${m.precio_venta}:${m.activo}:${m.padre_id}`).join("|")}
            productos={productos}
            editable={editable}
          />
        </div>
        <Tarjeta className="min-w-0 xl:col-span-2">
          <TituloTarjeta>Histórico de cambios</TituloTarjeta>
          <TablaDatos
            filas={historico ?? []}
            clave={(h) => h.id}
            vacio="Sin cambios registrados."
            columnas={[
              { titulo: "Producto", principal: true, celda: (h) => (h.metal as unknown as { nombre: string })?.nombre },
              { titulo: "Fecha", celda: (h) => fechaHora(h.fecha) },
              { titulo: "Compra", alinear: "der", celda: (h) => <span className="cifra">{soles(h.precio_compra)}</span> },
              { titulo: "Mayorista", alinear: "der", celda: (h) => <span className="cifra">{h.precio_mayorista != null ? soles(h.precio_mayorista) : "—"}</span> },
              { titulo: "Venta", alinear: "der", celda: (h) => <span className="cifra">{soles(h.precio_venta)}</span> },
            ]}
          />
        </Tarjeta>
      </div>
    </>
  );
}
