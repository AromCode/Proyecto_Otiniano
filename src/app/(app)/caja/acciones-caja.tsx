"use client";

import { useState } from "react";
import { ArrowLeftRight, Calculator, Receipt } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { Aviso } from "@/components/ui/basicos";
import { Campo, Input, InputNumero, Select } from "@/components/ui/campos";
import { FormularioAccion } from "@/components/ui/formulario";
import { subirArchivo } from "@/lib/archivos";
import { soles } from "@/lib/formato";
import { registrarArqueo, registrarGasto, registrarTraspaso } from "./acciones";

type Caja = { id: string; nombre: string; saldo: string };

export function AccionesCaja({
  empresaId, cajas, categorias, puedeAjustar,
}: { empresaId: string; cajas: Caja[]; categorias: { id: string; nombre: string }[]; puedeAjustar: boolean }) {
  const [abierto, setAbierto] = useState<"gasto" | "traspaso" | "arqueo" | null>(null);
  const [resultadoArqueo, setResultadoArqueo] = useState<{ diferencia: number; saldo_sistema: number } | null>(null);
  const [comprobante, setComprobante] = useState<string>("");
  const [subiendo, setSubiendo] = useState(false);
  const cerrar = () => { setAbierto(null); setComprobante(""); };
  const opcionesCaja = cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {soles(c.saldo)}</option>);

  return (
    <>
      <Boton onClick={() => setAbierto("gasto")}><Receipt className="size-4" /> Gasto</Boton>
      <Boton variante="secundario" onClick={() => setAbierto("traspaso")}><ArrowLeftRight className="size-4" /> Traspaso</Boton>
      <Boton variante="secundario" onClick={() => { setResultadoArqueo(null); setAbierto("arqueo"); }}><Calculator className="size-4" /> Arqueo</Boton>

      <Modal abierto={abierto === "gasto"} onCerrar={cerrar} titulo="Registrar gasto">
        <FormularioAccion accion={registrarGasto} textoBoton="Registrar gasto" onExito={cerrar}>
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
        <FormularioAccion accion={registrarTraspaso} textoBoton="Registrar traspaso" onExito={cerrar}>
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
