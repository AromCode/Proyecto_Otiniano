import type { Metadata } from "next";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fecha, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { NuevoComprador } from "./form-comprador";

export const metadata: Metadata = { title: "Compradores" };

export default async function CompradoresPage() {
  const { supabase, empresa, rol } = await exigir("verTodo", "vender");
  const { data } = await supabase.from("v_compradores_resumen").select("*").eq("empresa_id", empresa.id)
    .order("activo", { ascending: false }).order("importe_total", { ascending: false });

  return (
    <>
      <Encabezado titulo="Compradores" descripcion="Compradores mayores a quienes vendemos" acciones={puede(rol, "editarTerceros") && <NuevoComprador />} />
      <Tarjeta>
        <TablaDatos
          filas={data ?? []}
          clave={(c) => c.id}
          enlace={(c) => `/compradores/${c.id}`}
          vacio="Sin compradores registrados."
          columnas={[
            { titulo: "Razón social", principal: true, celda: (c) => <span className={c.activo ? "" : "text-stone-400"}>{c.razon_social}</span> },
            { titulo: "RUC", celda: (c) => c.ruc ?? "—" },
            { titulo: "Ventas", alinear: "der", celda: (c) => <span className="cifra">{c.n_ventas}</span> },
            { titulo: "Kg", alinear: "der", celda: (c) => <span className="cifra">{kg(c.kg_total)}</span> },
            { titulo: "Total", alinear: "der", principal: true, celda: (c) => <span className="cifra font-medium">{soles(c.importe_total)}</span> },
            { titulo: "Última", celda: (c) => fecha(c.ultima_venta) },
            { titulo: "Estado", ocultarMovil: true, celda: (c) => c.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia> },
          ]}
        />
      </Tarjeta>
    </>
  );
}
