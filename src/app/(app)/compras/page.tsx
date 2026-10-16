import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { fechaHora, kg, soles } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta } from "@/components/ui/basicos";
import { BotonLink } from "@/components/ui/boton";
import { TablaDatos } from "@/components/ui/tabla";
import { Filtros, rangoLima } from "@/components/filtros";

export const metadata: Metadata = { title: "Compras" };

type Params = { desde?: string; hasta?: string; estado?: string; metal?: string; q?: string };

export default async function ComprasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const { supabase, empresa, rol, userId } = await obtenerContexto();
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
    supabase.from("metales").select("id, nombre").eq("empresa_id", empresa.id).order("orden").order("nombre"),
  ]);
  const filas = compras ?? [];
  const vigentes = filas.filter((c) => c.estado === "registrada");
  const totalSoles = vigentes.reduce((s, c) => s + Number(c.total), 0);
  const totalKg = vigentes.reduce((s, c) => s + Number(c.kg_total), 0);

  return (
    <>
      <Encabezado
        titulo="Compras"
        descripcion={`${vigentes.length} compras · ${kg(totalKg)} · ${soles(totalSoles)}`}
        acciones={puede(rol, "comprar") && <BotonLink href="/comprar"><Plus className="size-4" /> Nueva compra</BotonLink>}
      />
      <Filtros
        valores={sp}
        busqueda={{ nombre: "q", placeholder: "N°, DNI o nombre" }}
        selects={[
          { nombre: "metal", etiqueta: "Metal", opciones: (metales ?? []).map((m) => ({ valor: m.id, texto: m.nombre })) },
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
            { titulo: "Proveedor", celda: (c) => c.proveedor_nombre ?? <span className="text-stone-400">Sin documento</span> },
            { titulo: "Metales", celda: (c) => c.metales },
            { titulo: "Kg", celda: (c) => <span className="cifra">{kg(c.kg_total)}</span>, alinear: "der" },
            {
              titulo: "Total", alinear: "der", principal: true,
              celda: (c) => (
                <span className={c.estado === "anulada" ? "cifra text-stone-400 line-through" : "cifra font-semibold"}>
                  {soles(c.total)}
                </span>
              ),
            },
            {
              titulo: "Estado",
              celda: (c) => c.estado === "anulada" ? <Insignia tono="rojo">Anulada</Insignia> : <Insignia tono="verde">Registrada</Insignia>,
            },
          ]}
        />
      </Tarjeta>
    </>
  );
}
