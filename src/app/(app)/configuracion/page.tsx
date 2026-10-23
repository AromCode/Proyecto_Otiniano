import type { Metadata } from "next";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { exigir } from "@/lib/contexto";
import { Encabezado, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { Campo, Input, InputNumero } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { ETIQUETA_ROL } from "@/lib/formato";
import { guardarEmpresa } from "./acciones";
import { cargarMediosPago } from "@/lib/productos";
import { Cajas, Categorias, MediosPago, Usuarios } from "./secciones";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const ctx = await exigir("configurar");
  const { supabase, empresa, userId } = ctx;
  const [{ data: miembros }, { data: cajas }, { data: categorias }, { data: uso }, medios] = await Promise.all([
    supabase.from("miembros").select("user_id, rol, nombre, email, activo").eq("empresa_id", empresa.id).order("creado_en"),
    supabase.from("cajas").select("*").eq("empresa_id", empresa.id).order("orden"),
    supabase.from("categorias_gasto").select("*").eq("empresa_id", empresa.id).order("nombre"),
    supabase.rpc("uso_consultas_doc", { p_empresa: empresa.id }),
    cargarMediosPago(ctx, false),
  ]);
  const consultas = (uso ?? {}) as { total?: number; empresa?: number; hoy?: number; guardados?: number };
  const usadas = Number(consultas.total ?? 0);

  return (
    <>
      <Encabezado titulo="Configuración" descripcion={<>Los productos y sus precios se gestionan en <Link href="/precios" className="text-marca-700 hover:underline">Productos y precios</Link>.</>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <TituloTarjeta>Empresa</TituloTarjeta>
          <div className="p-4">
            <FormularioAccion accion={guardarEmpresa} reiniciar={false} textoBoton="Guardar datos" mensajeExito="Datos de la empresa guardados.">
              <Campo etiqueta="Razón social"><Input name="razon_social" defaultValue={empresa.razon_social} required /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="RUC"><Input name="ruc" inputMode="numeric" maxLength={11} defaultValue={empresa.ruc ?? ""} /></Campo>
                <Campo etiqueta="Teléfono"><Input name="telefono" defaultValue={empresa.telefono ?? ""} /></Campo>
              </div>
              <Campo etiqueta="Dirección"><Input name="direccion" defaultValue={empresa.direccion ?? ""} /></Campo>
              <Campo etiqueta="Días para limpiar una compra" ayuda="Pasado este plazo, la compra aparece como «retrasada» en Limpieza.">
                <InputNumero name="dias_seleccion" defaultValue={String(empresa.dias_seleccion ?? 2)} inputMode="numeric" />
              </Campo>
              <Campo etiqueta="Merma alta desde (%)" ayuda="Una limpieza con más merma que este % se marca en rojo para que Gerencia la revise.">
                <InputNumero name="merma_alerta_pct" defaultValue={String(Number(empresa.merma_alerta_pct ?? 5))} />
              </Campo>
              <Campo etiqueta="Exigir DNI/RUC desde (S/)" ayuda="Vacío = nunca obligatorio. Por confirmar con el cliente.">
                <InputNumero name="monto_doc_obligatorio" defaultValue={empresa.monto_doc_obligatorio ?? ""} />
              </Campo>
              <fieldset>
                <legend className="mb-1 text-sm font-medium text-stone-700">Pueden digitar un precio/kg distinto al del día</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  {(["dueno", "administrador", "cajero", "balancero"] as const).map((r) => (
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

        <div className="space-y-4">
          <Tarjeta>
            <TituloTarjeta accion={<Link href="/socios" className="text-xs font-medium text-marca-700">Abrir</Link>}>Socios del negocio</TituloTarjeta>
            <p className="flex items-start gap-3 p-4 text-sm text-stone-600">
              <Handshake className="mt-0.5 size-5 shrink-0 text-stone-400" />
              <span>Participación de cada socio, aportes, retiros y utilidad que le corresponde. Es información de la sociedad: solo la edita Gerencia.</span>
            </p>
          </Tarjeta>
          <Tarjeta>
            <TituloTarjeta>Consultas DNI / RUC (RENIEC y SUNAT)</TituloTarjeta>
            <div className="space-y-3 p-4 text-sm">
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-stone-600">Consultas usadas</span>
                  <span className="cifra font-semibold">{usadas} <span className="font-normal text-stone-500">de 100 gratis</span></span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className={usadas >= 90 ? "h-full bg-red-500" : usadas >= 70 ? "h-full bg-amber-500" : "h-full bg-emerald-500"} style={{ width: `${Math.min(100, usadas)}%` }} />
                </div>
              </div>
              <p className="text-stone-500">
                Hoy: {Number(consultas.hoy ?? 0)} · Documentos guardados: {Number(consultas.guardados ?? 0)}. Solo se gasta una consulta al registrar un
                proveedor o cliente nuevo; si el documento ya se consultó o ya está registrado, se reutiliza sin costo.
              </p>
            </div>
          </Tarjeta>
        </div>
        <Usuarios miembros={miembros ?? []} yo={userId} />
        <Cajas cajas={cajas ?? []} />
        <MediosPago medios={medios} cajas={cajas ?? []} />
        <Categorias categorias={categorias ?? []} />
      </div>
    </>
  );
}
