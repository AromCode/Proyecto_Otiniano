import type { Metadata } from "next";
import { exigir } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fechaHora, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, PuntoMetal, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { TablaDatos } from "@/components/ui/tabla";
import { ResumenInventario } from "@/components/resumen-modulo";
import { AccionesInventario } from "./acciones-inventario";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventarioPage() {
  const ctx = await exigir("verTodo", "vender");
  const { supabase, empresa, rol } = ctx;
  const verCostos = puede(rol, "verTodo");
  const [{ data: stock }, { data: ajustes }] = await Promise.all([
    supabase.from("v_stock_metal").select("*").eq("empresa_id", empresa.id).order("orden").order("nombre"),
    supabase.from("v_ajustes").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }).limit(20),
  ]);
  const filas = (stock ?? []).filter((s) => s.activo || Number(s.kg) !== 0);

  return (
    <>
      <Encabezado
        titulo="Inventario"
        descripcion="Kilos en stock y su costo promedio ponderado"
        acciones={puede(rol, "ajustarInventario") && (
          <AccionesInventario metales={filas.map((f) => ({ id: f.metal_id, nombre: f.nombre, kg: f.kg }))} />
        )}
      />

      <ResumenInventario ctx={ctx} />

      <Tarjeta className="mb-4">
        <TablaDatos
          filas={filas}
          clave={(s) => s.metal_id}
          enlace={(s) => `/inventario/${s.metal_id}`}
          vacio="Sin metales."
          columnas={[
            { titulo: "Metal", principal: true, celda: (s) => <span className="flex items-center gap-2"><PuntoMetal color={s.color} />{s.nombre}{!s.activo && <Insignia>Inactivo</Insignia>}</span> },
            { titulo: "Stock", alinear: "der", principal: true, celda: (s) => <span className="cifra font-semibold">{kg(s.kg)}</span> },
            ...(verCostos ? [
              { titulo: "Costo prom./kg", alinear: "der" as const, celda: (s: (typeof filas)[number]) => <span className="cifra">{s.costo_promedio ? soles(s.costo_promedio) : "—"}</span> },
              { titulo: "Valor a costo", alinear: "der" as const, celda: (s: (typeof filas)[number]) => <span className="cifra">{soles(s.valor_costo)}</span> },
            ] : []),
            { titulo: "Precio venta", alinear: "der", celda: (s) => <span className="cifra">{soles(s.precio_venta)}</span> },
            { titulo: "Valor a venta", alinear: "der", celda: (s) => <span className="cifra">{soles(s.valor_venta)}</span> },
          ]}
        />
      </Tarjeta>

      <Tarjeta>
        <TituloTarjeta>Últimos ajustes</TituloTarjeta>
        <TablaDatos
          filas={ajustes ?? []}
          clave={(a) => a.id}
          vacio="Sin ajustes registrados."
          columnas={[
            { titulo: "Fecha", celda: (a) => fechaHora(a.fecha) },
            { titulo: "Metal", principal: true, celda: (a) => a.metal_nombre },
            { titulo: "Tipo", celda: (a) => <Insignia tono={a.tipo === "reclasificacion" ? "azul" : "ambar"}>{a.tipo === "reclasificacion" ? "Reclasificación" : a.tipo === "conteo" ? "Conteo" : a.tipo === "merma" ? "Merma" : "Otro"}</Insignia> },
            { titulo: "Kg", alinear: "der", principal: true, celda: (a) => <span className={`cifra ${Number(a.kg) < 0 ? "text-red-700" : "text-emerald-700"}`}>{Number(a.kg) > 0 ? "+" : ""}{kg(a.kg)}</span> },
            ...(verCostos ? [{ titulo: "Costo", alinear: "der" as const, celda: (a: NonNullable<typeof ajustes>[number]) => <span className="cifra">{soles(a.costo_total)}</span> }] : []),
            { titulo: "Motivo", celda: (a) => a.motivo },
          ]}
        />
      </Tarjeta>
    </>
  );
}
