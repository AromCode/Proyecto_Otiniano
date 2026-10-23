"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Insignia, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Select } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { Modal } from "@/components/ui/modal";
import { ETIQUETA_ROL } from "@/lib/formato";
import type { MedioPagoConf, Rol } from "@/lib/tipos";
import { actualizarMiembro, cambiarEstado, guardarCaja, guardarCategoria, guardarMedioPago, invitarUsuario } from "./acciones";

const DESCRIPCION_ROL: Record<Rol, string> = {
  dueno: "Ve todo: panel, stock, caja, capital, utilidad y reportes; anula y gestiona usuarios",
  administrador: "Productos y precios, proveedores y clientes, reportes; compra, vende y corrige tickets",
  cajero: "Almacén: registra compras y ventas, limpieza (mermas) y abre/cierra la caja del día",
  balancero: "Solo registra compras y limpieza",
  socio: "Solo lectura: ve todo y los reportes",
};

type Miembro = { user_id: string; rol: Rol; nombre: string | null; email: string | null; activo: boolean };

export function Usuarios({ miembros, yo }: { miembros: Miembro[]; yo: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(id: string, c: { rol?: Rol; activo?: boolean }) {
    setError(null);
    const r = await actualizarMiembro(id, c);
    if (!r.ok) setError(r.error);
    router.refresh();
  }

  return (
    <Tarjeta>
      <TituloTarjeta accion={<Boton tamano="sm" variante="secundario" onClick={() => setAbierto(true)}><Plus className="size-4" /> Usuario</Boton>}>
        Usuarios y roles
      </TituloTarjeta>
      {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-stone-100">
        {miembros.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className={`truncate font-medium ${m.activo ? "" : "text-stone-400"}`}>{m.nombre ?? m.email}</p>
              <p className="truncate text-xs text-stone-500">{m.email}</p>
            </div>
            {m.user_id === yo ? (
              <Insignia tono="marca">{ETIQUETA_ROL[m.rol]} (usted)</Insignia>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={m.rol}
                  onChange={(e) => cambiar(m.user_id, { rol: e.target.value as Rol })}
                  className="rounded-md border border-stone-200 bg-superficie px-2 py-1 text-sm"
                >
                  {(Object.keys(DESCRIPCION_ROL) as Rol[]).map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
                </select>
                <button onClick={() => cambiar(m.user_id, { activo: !m.activo })} className="text-xs font-medium text-stone-600 hover:text-stone-900">
                  {m.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo usuario">
        <FormularioAccion accion={invitarUsuario} onExito={() => setAbierto(false)} textoBoton="Crear usuario" mensajeExito="Usuario creado. Ya puede ingresar con su correo y contraseña.">
          <Campo etiqueta="Nombre"><Input name="nombre" required /></Campo>
          <Campo etiqueta="Correo"><Input name="email" type="email" required /></Campo>
          <Campo etiqueta="Contraseña inicial" ayuda="Mínimo 6 caracteres. Entréguela al usuario; si el correo ya tiene cuenta, conserva la suya.">
            <Input name="password" type="text" minLength={6} required />
          </Campo>
          <Campo etiqueta="Rol">
            <Select name="rol" defaultValue="cajero">
              {(Object.keys(DESCRIPCION_ROL) as Rol[]).map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]} — {DESCRIPCION_ROL[r]}</option>)}
            </Select>
          </Campo>
        </FormularioAccion>
      </Modal>
    </Tarjeta>
  );
}

type CajaFila = { id: string; nombre: string; tipo: string; orden: number; activo: boolean };

export function Cajas({ cajas }: { cajas: CajaFila[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<CajaFila | "nueva" | null>(null);
  const actual = editando === "nueva" ? null : editando;
  return (
    <Tarjeta>
      <TituloTarjeta accion={<Boton tamano="sm" variante="secundario" onClick={() => setEditando("nueva")}><Plus className="size-4" /> Caja</Boton>}>
        Cajas
      </TituloTarjeta>
      <ul className="divide-y divide-stone-100">
        {cajas.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <button onClick={() => setEditando(c)} className={`truncate text-left font-medium hover:underline ${c.activo ? "" : "text-stone-400"}`}>{c.nombre}</button>
            <div className="flex items-center gap-3">
              <Insignia>{c.tipo === "efectivo" ? "Efectivo" : c.tipo === "banco" ? "Banco" : "Billetera"}</Insignia>
              <button onClick={async () => { await cambiarEstado("cajas", c.id, !c.activo); router.refresh(); }} className="text-xs font-medium text-stone-600 hover:text-stone-900">
                {c.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Modal abierto={editando !== null} onCerrar={() => setEditando(null)} titulo={actual ? "Editar caja" : "Nueva caja"}>
        <FormularioAccion accion={guardarCaja} onExito={() => setEditando(null)} textoBoton="Guardar" mensajeExito="Caja guardada.">
          {actual && <input type="hidden" name="id" value={actual.id} />}
          <Campo etiqueta="Nombre"><Input name="nombre" defaultValue={actual?.nombre ?? ""} required /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Tipo">
              <Select name="tipo" defaultValue={actual?.tipo ?? "efectivo"}>
                <option value="efectivo">Efectivo</option>
                <option value="banco">Banco</option>
                <option value="billetera">Billetera (Yape/Plin)</option>
              </Select>
            </Campo>
            <Campo etiqueta="Orden"><Input name="orden" type="number" defaultValue={actual?.orden ?? 0} /></Campo>
          </div>
        </FormularioAccion>
      </Modal>
    </Tarjeta>
  );
}

export function Categorias({ categorias }: { categorias: { id: string; nombre: string; activo: boolean }[] }) {
  const router = useRouter();
  return (
    <Tarjeta>
      <TituloTarjeta>Categorías de gasto</TituloTarjeta>
      <div className="flex flex-wrap gap-2 p-4">
        {categorias.map((c) => (
          <button
            key={c.id}
            onClick={async () => { await cambiarEstado("categorias_gasto", c.id, !c.activo); router.refresh(); }}
            title={c.activo ? "Clic para desactivar" : "Clic para activar"}
            className={`rounded-full border px-3 py-1 text-sm ${c.activo ? "border-stone-300 bg-superficie" : "border-dashed border-stone-300 text-stone-400 line-through"}`}
          >
            {c.nombre}
          </button>
        ))}
      </div>
      <div className="border-t border-stone-100 p-4">
        <FormularioAccion accion={guardarCategoria} textoBoton="Agregar" mensajeExito="Categoría agregada." className="flex items-end gap-2">
          <Campo etiqueta="Nueva categoría" className="flex-1"><Input name="nombre" required /></Campo>
        </FormularioAccion>
      </div>
    </Tarjeta>
  );
}

const TIPOS_MEDIO = [["efectivo", "Efectivo"], ["yape", "Yape"], ["plin", "Plin"], ["transferencia", "Transferencia / depósito"]] as const;

/** Medios de pago editables: nombre, tipo base y la caja que usa por defecto */
export function MediosPago({ medios, cajas }: { medios: MedioPagoConf[]; cajas: CajaFila[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<MedioPagoConf | "nuevo" | null>(null);
  const actual = editando === "nuevo" ? null : editando;
  const cajaDe = (id: string | null) => cajas.find((c) => c.id === id)?.nombre ?? "Sin caja fija";
  return (
    <Tarjeta>
      <TituloTarjeta accion={<Boton tamano="sm" variante="secundario" onClick={() => setEditando("nuevo")}><Plus className="size-4" /> Medio</Boton>}>
        Medios de pago
      </TituloTarjeta>
      <ul className="divide-y divide-stone-100">
        {medios.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <button onClick={() => setEditando(m)} className={`min-w-0 text-left hover:underline ${m.activo ? "" : "text-stone-400"}`}>
              <span className="block truncate font-medium">{m.nombre}</span>
              <span className="block truncate text-xs text-stone-500">{cajaDe(m.caja_id)}</span>
            </button>
            <div className="flex items-center gap-3">
              <Insignia>{TIPOS_MEDIO.find(([v]) => v === m.tipo)?.[1] ?? m.tipo}</Insignia>
              <button onClick={async () => { await cambiarEstado("medios_pago", m.id, !m.activo); router.refresh(); }} className="text-xs font-medium text-stone-600 hover:text-stone-900">
                {m.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">Al elegir el medio en una compra o venta se propone su caja.</p>
      <Modal abierto={editando !== null} onCerrar={() => setEditando(null)} titulo={actual ? "Editar medio de pago" : "Nuevo medio de pago"}>
        <FormularioAccion accion={guardarMedioPago} onExito={() => setEditando(null)} textoBoton="Guardar" mensajeExito="Medio de pago guardado.">
          {actual && <input type="hidden" name="id" value={actual.id} />}
          <Campo etiqueta="Nombre" ayuda="Ej.: Yape Jorge, BCP, Interbank"><Input name="nombre" defaultValue={actual?.nombre ?? ""} required /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Tipo">
              <Select name="tipo" defaultValue={actual?.tipo ?? "efectivo"}>
                {TIPOS_MEDIO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Orden"><Input name="orden" type="number" defaultValue={actual?.orden ?? 0} /></Campo>
          </div>
          <Campo etiqueta="Caja que usa">
            <Select name="caja_id" defaultValue={actual?.caja_id ?? ""}>
              <option value="">Sin caja fija (se elige al registrar)</option>
              {cajas.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </Campo>
        </FormularioAccion>
      </Modal>
    </Tarjeta>
  );
}
