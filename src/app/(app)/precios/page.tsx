import type { Metadata } from "next";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fechaHora, soles } from "@/lib/formato";
import { Encabezado, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import type { Metal } from "@/lib/tipos";
import { TablaPrecios } from "./tabla-precios";

export const metadata: Metadata = { title: "Precios del día" };

export default async function PreciosPage() {
  const { supabase, empresa, rol } = await obtenerContexto();
  const [{ data: metales }, { data: historico }] = await Promise.all([
    supabase.from("metales").select("*").eq("empresa_id", empresa.id).order("activo", { ascending: false }).order("orden").order("nombre"),
    supabase.from("precios_metal").select("id, fecha, precio_compra, precio_venta, metal:metales(nombre)")
      .eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(60),
  ]);

  return (
    <>
      <Encabezado
        titulo="Precios del día"
        descripcion={puede(rol, "editarPrecios") ? "Cambie los precios y guarde. Cada cambio queda en el histórico." : "Precios vigentes de compra y venta por kg."}
      />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TablaPrecios
            // Se remonta cuando cambian los datos guardados, para no quedar con valores viejos
            key={(metales ?? []).map((m) => `${m.id}:${m.precio_compra}:${m.precio_venta}:${m.activo}`).join("|")}
            metales={(metales ?? []) as Metal[]}
            editable={puede(rol, "editarPrecios")}
          />
        </div>
        <Tarjeta className="lg:col-span-2">
          <TituloTarjeta>Histórico de cambios</TituloTarjeta>
          <TablaDatos
            filas={historico ?? []}
            clave={(h) => h.id}
            vacio="Sin cambios registrados."
            columnas={[
              { titulo: "Metal", principal: true, celda: (h) => (h.metal as unknown as { nombre: string })?.nombre },
              { titulo: "Fecha", celda: (h) => fechaHora(h.fecha) },
              { titulo: "Compra", alinear: "der", celda: (h) => <span className="cifra">{soles(h.precio_compra)}</span> },
              { titulo: "Venta", alinear: "der", celda: (h) => <span className="cifra">{soles(h.precio_venta)}</span> },
            ]}
          />
        </Tarjeta>
      </div>
    </>
  );
}
