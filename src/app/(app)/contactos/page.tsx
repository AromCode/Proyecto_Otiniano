import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, Search, Users } from "lucide-react";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { soles } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { claseBoton, claseInput, cx } from "@/components/ui/clases";
import { TONOS } from "@/components/shell/modulos";

export const metadata: Metadata = { title: "Contactos" };

interface Resultado {
  id: string;
  tipo: "proveedor" | "cliente";
  nombre: string;
  documento: string | null;
  detalle: string;
  activo: boolean;
}

const TIPOS = {
  proveedor: { texto: "Proveedor", href: "/proveedores", icono: Users },
  cliente: { texto: "Cliente", href: "/compradores", icono: Building2 },
} as const;

/** Buscador único: un DNI, RUC o nombre y aparece donde esté (proveedor o cliente). Los socios están en Gestión. */
export default async function ContactosPage({ searchParams }: { searchParams: Promise<{ q?: string; inactivos?: string }> }) {
  const sp = await searchParams;
  const { supabase, empresa, rol } = await obtenerContexto();
  const verClientes = puede(rol, "vender") || puede(rol, "verTodo");
  const t = (sp.q ?? "").trim().replace(/[%,()]/g, "");
  const conInactivos = sp.inactivos === "1";
  const esNumero = /^\d+$/.test(t);

  const cuenta = (tabla: "proveedores" | "compradores") =>
    supabase.from(tabla).select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("activo", true);

  const buscar = async (): Promise<Resultado[]> => {
    if (!t) return [];
    let qp = supabase.from("v_proveedores_resumen").select("id, nombre, tipo_doc, nro_doc, telefono, importe_total, activo")
      .eq("empresa_id", empresa.id).limit(30);
    qp = esNumero ? qp.like("nro_doc", `${t}%`) : qp.ilike("nombre", `%${t}%`);
    if (!conInactivos) qp = qp.eq("activo", true);

    let qc = supabase.from("v_compradores_resumen").select("id, razon_social, ruc, contacto, importe_total, activo")
      .eq("empresa_id", empresa.id).limit(30);
    qc = esNumero ? qc.like("ruc", `${t}%`) : qc.or(`razon_social.ilike.%${t}%,contacto.ilike.%${t}%`);
    if (!conInactivos) qc = qc.eq("activo", true);

    const [p, c] = await Promise.all([qp, verClientes ? qc : null]);
    return [
      ...(p.data ?? []).map((x): Resultado => ({
        id: x.id, tipo: "proveedor", nombre: x.nombre, activo: x.activo,
        documento: x.nro_doc ? `${x.tipo_doc} ${x.nro_doc}` : null,
        detalle: `Le compramos ${soles(x.importe_total)}${x.telefono ? ` · ${x.telefono}` : ""}`,
      })),
      ...(c?.data ?? []).map((x): Resultado => ({
        id: x.id, tipo: "cliente", nombre: x.razon_social, activo: x.activo,
        documento: x.ruc ? `RUC ${x.ruc}` : null,
        detalle: `Le vendimos ${soles(x.importe_total)}${x.contacto ? ` · ${x.contacto}` : ""}`,
      })),
    ];
  };

  const [resultados, nProv, nCli] = await Promise.all([
    buscar(), cuenta("proveedores"), verClientes ? cuenta("compradores") : null,
  ]);

  const tarjetas = [
    { tipo: "proveedor" as const, n: nProv.count ?? 0, texto: "Proveedores activos", ayuda: "Nos venden material" },
    ...(nCli ? [{ tipo: "cliente" as const, n: nCli.count ?? 0, texto: "Clientes activos", ayuda: "Les vendemos" }] : []),
  ];
  const t2 = TONOS.fuchsia;

  return (
    <>
      <Encabezado titulo="Contactos" descripcion="Proveedores y clientes en un solo lugar" />

      <form method="get" className="mb-4">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-stone-400" />
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              autoFocus={!t}
              inputMode="search"
              placeholder="Buscar por DNI, RUC o nombre…"
              className={cx(claseInput, "h-12 pl-10 text-base sm:text-base")}
            />
          </label>
          <button className={cx(claseBoton("primario", "md"), "h-12 px-5")}>Buscar</button>
        </div>
        <label className="mt-2 inline-flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" name="inactivos" value="1" defaultChecked={conInactivos} className="size-4 accent-marca-600" />
          Incluir inactivos
        </label>
      </form>

      {t ? (
        <Tarjeta>
          <TituloTarjeta>{resultados.length === 0 ? "Sin resultados" : `${resultados.length} resultado(s) para “${t}”`}</TituloTarjeta>
          <ul className="divide-y divide-stone-100">
            {resultados.map((r) => {
              const tipo = TIPOS[r.tipo];
              return (
                <li key={`${r.tipo}-${r.id}`}>
                  <Link href={`${tipo.href}/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                    <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-lg", t2.chip)}>
                      <tipo.icono className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className={cx("truncate font-medium", !r.activo && "text-stone-400")}>{r.nombre}</span>
                        <Insignia>{tipo.texto}</Insignia>
                        {!r.activo && <Insignia tono="rojo">Inactivo</Insignia>}
                      </span>
                      <span className="block truncate text-sm text-stone-500">
                        {r.documento ?? "Sin documento"} · {r.detalle}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-stone-400" />
                  </Link>
                </li>
              );
            })}
            {resultados.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-stone-500">
                No encontramos “{t}”. Revise el número o regístrelo como{" "}
                <Link href="/proveedores" className="font-medium text-marca-700 underline">proveedor</Link>
                {verClientes && <> o <Link href="/compradores" className="font-medium text-marca-700 underline">cliente</Link></>}.
              </li>
            )}
          </ul>
        </Tarjeta>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tarjetas.map((x) => {
            const tipo = TIPOS[x.tipo];
            return (
              <Link key={x.tipo} href={tipo.href} className="block">
                <Tarjeta className={cx("flex items-center gap-4 border-l-4 p-4 transition hover:shadow-md", t2.barra)}>
                  <span className={cx("flex size-12 shrink-0 items-center justify-center rounded-xl", t2.chip)}>
                    <tipo.icono className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="cifra block text-2xl font-semibold">{x.n}</span>
                    <span className="block text-sm font-medium text-stone-700">{x.texto}</span>
                    <span className="block text-xs text-stone-500">{x.ayuda}</span>
                  </span>
                  <ChevronRight className="size-5 text-stone-400" />
                </Tarjeta>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
