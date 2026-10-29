import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fechaHora, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta } from "@/components/ui/basicos";
import { BotonLink } from "@/components/ui/boton";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros, rangoLima } from "@/components/filtros";
import { ResumenCompras } from "@/components/resumen-modulo";
import { TituloSeccion } from "@/components/panel-modulo";

export const metadata: Metadata = { title: "Compras" };

type Params = { desde?: string; hasta?: string; estado?: string; metal?: string; q?: string };

export default async function ComprasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const ctx = await obtenerContexto();
  const { supabase, empresa, rol, userId } = ctx;
  const { desde, hasta } = rangoLima(sp.desde, sp.hasta);

  let q = supabase.from("v_compras").select("*").eq("empresa_id", empresa.id)
    .order("fecha", { ascending: false }).limit(200);
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lt("fecha", hasta);
  if (sp.estado) q = q.eq("estado", sp.estado);
  if (sp.metal) q = q.contains("metal_ids", [sp.metal]);
  if (sp.q?.trim()) {
    const t = sp.q.trim().replace(/[%,()]/g, "");
    q = /^\d+$/.test(t) ? q.or(`numero.eq.${t},proveedor_nro_doc.like.${t}%`) : q.ilike("proveedor_nombre", `%${t}%`);
  }
  // El balancero solo ve lo que él registró
  if (rol === "balancero") q = q.eq("creado_por", userId);

  const [{ data: compras }, { data: metales }] = await Promise.all([
    q,
    supabase.from("v_productos").select("id, nombre:ruta").eq("empresa_id", empresa.id).order("clave_orden"),
  ]);
  const filas = compras ?? [];
  const vigentes = filas.filter((c) => c.estado === "registrada");
  const totalSoles = vigentes.reduce((s, c) => s + Number(c.total), 0);
  const totalKg = vigentes.reduce((s, c) => s + Number(c.kg_total), 0);
  const precioProm = totalKg > 0 ? totalSoles / totalKg : null;

  return (
    <>
      <Encabezado
        titulo="Compras"
        descripcion="Material que entra: lo que pagamos a cada proveedor"
        acciones={puede(rol, "comprar") && <BotonLink href="/comprar"><Plus className="size-4" /> Nueva compra</BotonLink>}
      />
      {rol !== "balancero" && <ResumenCompras ctx={ctx} />}
      <TituloSeccion
        titulo="Historial de compras"
        detalle={`${vigentes.length} compras · ${kg(totalKg)} · ${soles(totalSoles)}${precioProm ? ` · promedio ${soles(precioProm)}/kg` : ""}`}
      />
      <Filtros
        valores={sp}
        busqueda={{ nombre: "q", placeholder: "N°, DNI o nombre" }}
        selects={[
          { nombre: "metal", etiqueta: "Producto", opciones: (metales ?? []).map((m) => ({ valor: m.id, texto: m.nombre })) },
          { nombre: "estado", etiqueta: "Estado", opciones: [{ valor: "registrada", texto: "Registradas" }, { valor: "anulada", texto: "Anuladas" }] },
        ]}
      />
      <Tarjeta>
        <TablaDatos
          filas={filas}
          clave={(c) => c.id}
          enlace={(c) => `/compras/${c.id}`}
          vacio="No hay compras con esos filtros."
          columnas={[
            { titulo: "N°", celda: (c) => <span className="cifra">#{c.numero}</span>, principal: true },
            { titulo: "Fecha", celda: (c) => fechaHora(c.fecha) },
            { titulo: "Proveedor", celda: (c) => c.proveedor_nombre ?? <span className="text-stone-500">Sin documento</span> },
            { titulo: "Productos", celda: (c) => c.metales },
            { titulo: "Kg", celda: (c) => <span className="cifra">{kg(c.kg_total)}</span>, alinear: "der" },
            { titulo: "S/ por kg", alinear: "der", ocultarMovil: true, celda: (c) => <span className="cifra text-stone-600">{c.precio_promedio ? soles(c.precio_promedio) : "—"}</span> },
            {
              titulo: "Total", alinear: "der", principal: true,
              celda: (c) => (
                <span className={c.estado === "anulada" ? "cifra text-stone-500 line-through" : "cifra font-semibold"}>
                  {soles(c.total)}
                </span>
              ),
            },
            {
              titulo: "Estado",
              celda: (c) => c.estado === "anulada" ? <Insignia tono="rojo">Anulada</Insignia>
                : c.retrasada ? <Insignia tono="rojo">Limpieza retrasada</Insignia>
                : c.por_seleccionar ? <Insignia tono="ambar">Por limpiar</Insignia>
                : Number(c.seleccion_kg) > 0 ? <Insignia tono={c.merma_alta ? "rojo" : "azul"}>Merma {Number(c.merma_pct ?? 0).toLocaleString("es-PE")} %</Insignia>
                : <Insignia tono="verde">Limpia</Insignia>,
            },
          ]}
        />
      </Tarjeta>
    </>
  );
}
