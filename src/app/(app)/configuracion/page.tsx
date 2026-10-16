import type { Metadata } from "next";
import Link from "next/link";
import { exigir } from "@/lib/contexto";
import { Encabezado, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { Campo, Input, InputNumero } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { ETIQUETA_ROL } from "@/lib/formato";
import { guardarEmpresa } from "./acciones";
import { Cajas, Categorias, Usuarios } from "./secciones";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const { supabase, empresa, userId } = await exigir("configurar");
  const [{ data: miembros }, { data: cajas }, { data: categorias }] = await Promise.all([
    supabase.from("miembros").select("user_id, rol, nombre, email, activo").eq("empresa_id", empresa.id).order("creado_en"),
    supabase.from("cajas").select("*").eq("empresa_id", empresa.id).order("orden"),
    supabase.from("categorias_gasto").select("*").eq("empresa_id", empresa.id).order("nombre"),
  ]);

  return (
    <>
      <Encabezado titulo="Configuración" descripcion={<>Los metales y sus precios se gestionan en <Link href="/precios" className="text-marca-700 hover:underline">Precios del día</Link>.</>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <TituloTarjeta>Empresa</TituloTarjeta>
          <div className="p-4">
            <FormularioAccion accion={guardarEmpresa} reiniciar={false} textoBoton="Guardar datos">
              <Campo etiqueta="Razón social"><Input name="razon_social" defaultValue={empresa.razon_social} required /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="RUC"><Input name="ruc" inputMode="numeric" maxLength={11} defaultValue={empresa.ruc ?? ""} /></Campo>
                <Campo etiqueta="Teléfono"><Input name="telefono" defaultValue={empresa.telefono ?? ""} /></Campo>
              </div>
              <Campo etiqueta="Dirección"><Input name="direccion" defaultValue={empresa.direccion ?? ""} /></Campo>
              <Campo etiqueta="Exigir DNI/RUC desde (S/)" ayuda="Vacío = nunca obligatorio. Por confirmar con el cliente.">
                <InputNumero name="monto_doc_obligatorio" defaultValue={empresa.monto_doc_obligatorio ?? ""} />
              </Campo>
              <fieldset>
                <legend className="mb-1 text-sm font-medium text-stone-700">Pueden cambiar el precio/kg en el mostrador</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  {(["dueno", "cajero", "balancero"] as const).map((r) => (
                    <label key={r} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        name={`precio_${r}`}
                        defaultChecked={empresa.roles_editan_precio.includes(r)}
                        disabled={r === "dueno"}
                        className="size-4 accent-marca-600"
                      />
                      {ETIQUETA_ROL[r]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </FormularioAccion>
          </div>
        </Tarjeta>

        <Usuarios miembros={miembros ?? []} yo={userId} />
        <Cajas cajas={cajas ?? []} />
        <Categorias categorias={categorias ?? []} />
      </div>
    </>
  );
}
