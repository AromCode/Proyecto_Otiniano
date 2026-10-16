"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { Campo, Input, Textarea } from "@/components/ui/campos";
import { Aviso } from "@/components/ui/basicos";
import { Boton } from "@/components/ui/boton";
import { subirArchivo } from "@/lib/archivos";
import { actualizarGuia } from "../acciones";

export function EditarGuia({
  ventaId, empresaId, puedeEditar, guiaNumero, guiaRuta, guiaUrl, comprobanteRuta, comprobanteUrl, notas,
}: {
  ventaId: string;
  empresaId: string;
  puedeEditar: boolean;
  guiaNumero: string | null;
  guiaRuta: string | null;
  guiaUrl: string | null;
  comprobanteRuta: string | null;
  comprobanteUrl: string | null;
  notas: string | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [numero, setNumero] = useState(guiaNumero ?? "");
  const [nota, setNota] = useState(notas ?? "");
  const [guia, setGuia] = useState<File | null>(null);
  const [comp, setComp] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const r = await actualizarGuia({
        venta_id: ventaId,
        guia_numero: numero.trim() || null,
        guia_url: guia ? await subirArchivo(empresaId, "guias", guia) : guiaRuta,
        comprobante_url: comp ? await subirArchivo(empresaId, "comprobantes", comp) : comprobanteRuta,
        notas: nota.trim() || null,
      });
      if (!r.ok) setError(r.error);
      else {
        setEditando(false);
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium">Guía y documentos</p>
          {puedeEditar && <button onClick={() => setEditando(true)} className="text-marca-700 hover:underline">Editar</button>}
        </div>
        <p>Guía N°: <span className="font-medium">{guiaNumero ?? "—"}</span></p>
        <div className="flex flex-wrap gap-3">
          {guiaUrl && <a href={guiaUrl} target="_blank" className="inline-flex items-center gap-1 text-marca-700 hover:underline"><Paperclip className="size-3.5" />Guía</a>}
          {comprobanteUrl && <a href={comprobanteUrl} target="_blank" className="inline-flex items-center gap-1 text-marca-700 hover:underline"><Paperclip className="size-3.5" />Comprobante</a>}
        </div>
        {notas && <p className="rounded-lg bg-stone-50 p-2 text-stone-700">{notas}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Campo etiqueta="N° de guía"><Input value={numero} onChange={(e) => setNumero(e.target.value)} /></Campo>
      <Campo etiqueta="Archivo de guía">
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setGuia(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
      </Campo>
      <Campo etiqueta="Comprobante">
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setComp(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
      </Campo>
      <Campo etiqueta="Notas"><Textarea value={nota} onChange={(e) => setNota(e.target.value)} /></Campo>
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <div className="flex gap-2">
        <Boton onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Boton>
        <Boton variante="fantasma" onClick={() => setEditando(false)}>Cancelar</Boton>
      </div>
    </div>
  );
}
