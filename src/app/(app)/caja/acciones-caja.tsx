"use client";

import { useState } from "react";
import { ArrowLeftRight, Calculator, Lock, LockOpen, Receipt } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { Aviso } from "@/components/ui/basicos";
import { Campo, Input, InputNumero, Select } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { claseBoton, cx } from "@/components/ui/clases";
import { useNotificar } from "@/components/ui/notificaciones";
import { BotonImprimir80 } from "@/components/ticket/boton-imprimir-80";
import { subirArchivo } from "@/lib/archivos";
import { fechaHora, soles } from "@/lib/formato";
import type { ResumenTurno } from "@/lib/tipos";
import { abrirCaja, cerrarCaja, registrarArqueo, registrarGasto, registrarTraspaso } from "./acciones";

type Caja = { id: string; nombre: string; saldo: string };
export type TurnoAbierto = { id: string; numero: number; caja_id: string; caja_nombre: string; abierto_en: string };

export function AccionesCaja({
  empresaId, cajas, categorias, puedeAjustar, turnos,
}: { empresaId: string; cajas: Caja[]; categorias: { id: string; nombre: string }[]; puedeAjustar: boolean; turnos: TurnoAbierto[] }) {
  const [abierto, setAbierto] = useState<"gasto" | "traspaso" | "arqueo" | "abrir" | "cierre" | null>(null);
  const [resultadoArqueo, setResultadoArqueo] = useState<{ diferencia: number; saldo_sistema: number } | null>(null);
  const [resultadoCierre, setResultadoCierre] = useState<ResumenTurno | null>(null);
  const [comprobante, setComprobante] = useState<string>("");
  const [subiendo, setSubiendo] = useState(false);
  const notificar = useNotificar();
  const cerrar = () => { setAbierto(null); setComprobante(""); };
  const opcionesCaja = cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {soles(c.saldo)}</option>);
  const sinTurno = cajas.filter((c) => !turnos.some((t) => t.caja_id === c.id));
  const difCierre = Number(resultadoCierre?.diferencia_cierre ?? 0);

  return (
    <>
      {sinTurno.length > 0 && (
        <Boton variante={turnos.length ? "secundario" : "primario"} onClick={() => setAbierto("abrir")}><LockOpen className="size-4" /> Abrir caja</Boton>
      )}
      {turnos.length > 0 && (
        <Boton onClick={() => { setResultadoCierre(null); setAbierto("cierre"); }}><Lock className="size-4" /> Cerrar caja</Boton>
      )}

      <Modal abierto={abierto === "abrir"} onCerrar={cerrar} titulo="Abrir caja">
        <FormularioAccion
          accion={abrirCaja}
          textoBoton="Abrir caja"
          mensajeExito={false}
          onExito={(d) => {
            const r = d as { numero: number; diferencia: number };
            notificar(Number(r.diferencia) === 0
              ? { titulo: `Caja abierta · turno N° ${r.numero}` }
              : { titulo: `Caja abierta · turno N° ${r.numero}`, mensaje: `Lo contado difiere del sistema en ${soles(r.diferencia)}.`, tono: "aviso" });
            cerrar();
          }}
        >
          <p className="text-sm text-stone-600">Cuente el efectivo con que empieza el día. Al cerrar, el sistema le dará el resumen de todo lo que entró y salió.</p>
          <Campo etiqueta="Caja">
            <Select name="caja_id" required>{sinTurno.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {soles(c.saldo)}</option>)}</Select>
          </Campo>
          <Campo etiqueta="Efectivo al abrir S/"><InputNumero name="contado" required /></Campo>
          <Campo etiqueta="Nota (opcional)"><Input name="nota" /></Campo>
        </FormularioAccion>
      </Modal>

      <Modal abierto={abierto === "cierre"} onCerrar={cerrar} titulo={resultadoCierre ? `Cierre de caja · turno N° ${resultadoCierre.numero}` : "Cerrar caja"}>
        {resultadoCierre ? (
          <div className="space-y-3">
            <Aviso tono={difCierre === 0 ? "verde" : "ambar"}>
              {difCierre === 0
                ? "La caja cuadra exactamente."
                : `${difCierre > 0 ? "Sobran" : "Faltan"} ${soles(Math.abs(difCierre))} frente a ${soles(resultadoCierre.saldo_sistema)} del sistema.`}
            </Aviso>
            <dl className="divide-y divide-stone-100 rounded-lg border border-stone-200 text-sm">
              {([
                ["Saldo inicial", soles(resultadoCierre.saldo_apertura)],
                ["Ingresos", `+ ${soles(resultadoCierre.ingresos)}`],
                ["Egresos", `− ${soles(resultadoCierre.egresos)}`],
                ["Saldo esperado", soles(resultadoCierre.esperado)],
                ["Contado", soles(resultadoCierre.contado_cierre)],
              ] as const).map(([a, b]) => (
                <div key={a} className="flex justify-between px-3 py-2"><dt className="text-stone-600">{a}</dt><dd className="cifra font-medium">{b}</dd></div>
              ))}
            </dl>
            <div className="flex flex-col gap-2 sm:flex-row">
              <BotonImprimir80
                href={`/imprimir/cierre/${resultadoCierre.id}`}
                texto="Imprimir cierre"
                className={cx(claseBoton("primario"), "flex-1")}
              />
              <Boton variante="secundario" onClick={cerrar} className="flex-1">Listo</Boton>
            </div>
          </div>
        ) : (
          <FormularioAccion
            accion={cerrarCaja}
            textoBoton="Cerrar caja"
            mensajeExito="Caja cerrada."
            reiniciar={false}
            onExito={(d) => setResultadoCierre(d as ResumenTurno)}
          >
            <p className="text-sm text-stone-600">Cuente el efectivo que hay ahora. El sistema compara con lo que debería haber y le da el resumen para imprimir.</p>
            <Campo etiqueta="Turno">
              <Select name="turno_id" required>
                {turnos.map((t) => <option key={t.id} value={t.id}>{t.caja_nombre} · N° {t.numero} · desde {fechaHora(t.abierto_en)}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Efectivo contado S/"><InputNumero name="contado" required /></Campo>
            <Campo etiqueta="Nota (opcional)"><Input name="nota" placeholder="Ej.: faltante por vuelto mal dado" /></Campo>
            {puedeAjustar && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ajustar" className="size-4 accent-marca-600" />
                Ajustar el saldo del sistema a lo contado
              </label>
            )}
          </FormularioAccion>
        )}
      </Modal>

      <Boton onClick={() => setAbierto("gasto")}><Receipt className="size-4" /> Gasto</Boton>
      <Boton variante="secundario" onClick={() => setAbierto("traspaso")}><ArrowLeftRight className="size-4" /> Traspaso</Boton>
      <Boton variante="secundario" onClick={() => { setResultadoArqueo(null); setAbierto("arqueo"); }}><Calculator className="size-4" /> Arqueo</Boton>

      <Modal abierto={abierto === "gasto"} onCerrar={cerrar} titulo="Registrar gasto">
        <FormularioAccion accion={registrarGasto} textoBoton="Registrar gasto" mensajeExito="Gasto registrado." onExito={cerrar}>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Monto S/"><InputNumero name="monto" required /></Campo>
            <Campo etiqueta="Categoría">
              <Select name="categoria_id">
                <option value="">—</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </Campo>
          </div>
          <Campo etiqueta="Concepto"><Input name="concepto" required placeholder="Ej.: recibo de luz de octubre" /></Campo>
          <Campo etiqueta="Sale de la caja"><Select name="caja_id" required>{opcionesCaja}</Select></Campo>
          <Campo etiqueta="Comprobante (opcional)" ayuda={subiendo ? "Subiendo…" : comprobante ? "Archivo adjunto ✓" : undefined}>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="block w-full text-sm"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setSubiendo(true);
                try { setComprobante(await subirArchivo(empresaId, "gastos", f)); } finally { setSubiendo(false); }
              }}
            />
          </Campo>
          <input type="hidden" name="comprobante_url" value={comprobante} />
        </FormularioAccion>
      </Modal>

      <Modal abierto={abierto === "traspaso"} onCerrar={cerrar} titulo="Traspaso entre cajas">
        <FormularioAccion accion={registrarTraspaso} textoBoton="Registrar traspaso" mensajeExito="Traspaso registrado." onExito={cerrar}>
          <Campo etiqueta="Desde"><Select name="origen" required>{opcionesCaja}</Select></Campo>
          <Campo etiqueta="Hacia"><Select name="destino" required defaultValue={cajas[1]?.id}>{opcionesCaja}</Select></Campo>
          <Campo etiqueta="Monto S/"><InputNumero name="monto" required /></Campo>
          <Campo etiqueta="Concepto (opcional)"><Input name="concepto" placeholder="Ej.: depósito al banco" /></Campo>
        </FormularioAccion>
      </Modal>

      <Modal abierto={abierto === "arqueo"} onCerrar={cerrar} titulo="Arqueo de caja">
        {resultadoArqueo ? (
          <div className="space-y-3">
            <Aviso tono={resultadoArqueo.diferencia === 0 ? "verde" : "ambar"}>
              {Number(resultadoArqueo.diferencia) === 0
                ? "La caja cuadra exactamente."
                : `Diferencia de ${soles(resultadoArqueo.diferencia)} (${Number(resultadoArqueo.diferencia) > 0 ? "sobra" : "falta"}) frente a ${soles(resultadoArqueo.saldo_sistema)} del sistema.`}
            </Aviso>
            <Boton onClick={cerrar} className="w-full">Cerrar</Boton>
          </div>
        ) : (
          <FormularioAccion
            accion={registrarArqueo}
            textoBoton="Registrar arqueo"
            mensajeExito="Arqueo registrado."
            reiniciar={false}
            onExito={(d) => setResultadoArqueo(d as { diferencia: number; saldo_sistema: number })}
          >
            <p className="text-sm text-stone-600">Cuente el efectivo y anótelo. El sistema guarda la diferencia con su saldo.</p>
            <Campo etiqueta="Caja"><Select name="caja_id" required>{opcionesCaja}</Select></Campo>
            <Campo etiqueta="Efectivo contado S/"><InputNumero name="contado" required /></Campo>
            <Campo etiqueta="Nota (opcional)"><Input name="nota" /></Campo>
            {puedeAjustar && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ajustar" className="size-4 accent-marca-600" />
                Ajustar el saldo del sistema a lo contado
              </label>
            )}
          </FormularioAccion>
        )}
      </Modal>
    </>
  );
}
