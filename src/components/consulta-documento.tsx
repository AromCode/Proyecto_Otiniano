"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";
import { cx } from "@/components/ui/clases";

// Consulta DNI/RUC (RENIEC/SUNAT) desde los formularios de alta. La ruta /api/consulta-doc decide
// si gasta una consulta o reutiliza lo ya guardado; aquí solo se muestra el resultado.

export interface DatosDocumento {
  nombre: string | null;
  direccion: string | null;
  telefono?: string | null;
  estado?: string | null;
  condicion?: string | null;
  origen: "registrado" | "guardado" | "consulta";
  registrado?: { tipo: "proveedor" | "comprador" | "socio"; id: string; nombre: string } | null;
}

type Estado =
  | { fase: "libre" }
  | { fase: "consultando" }
  | { fase: "listo"; datos: DatosDocumento }
  | { fase: "error"; mensaje: string };

/**
 * RUC de persona natural (empieza en 10) a partir del DNI, con su dígito verificador (módulo 11 de SUNAT).
 * Sirve para buscar la dirección fiscal: RENIEC solo da el nombre.
 */
export function ruc10DesdeDni(dni: string): string | null {
  if (!/^\d{8}$/.test(dni)) return null;
  const base = `10${dni}`;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((s, p, i) => s + p * Number(base[i]), 0);
  const dv = 11 - (suma % 11);
  return base + (dv === 10 ? 0 : dv === 11 ? 1 : dv);
}

export function useConsultaDocumento(para: "proveedor" | "comprador" | "socio") {
  const [estado, setEstado] = useState<Estado>({ fase: "libre" });
  const ultimo = useRef<string>("");

  async function consultar(tipo: string, numero: string): Promise<DatosDocumento | null> {
    const n = numero.trim();
    if (!(tipo === "DNI" && /^\d{8}$/.test(n)) && !(tipo === "RUC" && /^\d{11}$/.test(n))) {
      setEstado({ fase: "error", mensaje: tipo === "DNI" ? "El DNI debe tener 8 dígitos." : "El RUC debe tener 11 dígitos." });
      return null;
    }
    const clave = `${tipo}:${n}`;
    ultimo.current = clave;
    setEstado({ fase: "consultando" });
    try {
      const r = await fetch(`/api/consulta-doc?tipo=${tipo}&numero=${n}&para=${para}`);
      const d = await r.json().catch(() => ({}));
      if (ultimo.current !== clave) return null; // llegó tarde: el usuario ya cambió el número
      if (!r.ok) {
        setEstado({
          fase: "error",
          mensaje: r.status === 501 ? "La consulta automática no está configurada: ingrese los datos a mano." : d.error ?? "No se pudo consultar.",
        });
        return null;
      }
      setEstado({ fase: "listo", datos: d as DatosDocumento });
      return d as DatosDocumento;
    } catch {
      setEstado({ fase: "error", mensaje: "Sin conexión: ingrese los datos a mano." });
      return null;
    }
  }

  return { estado, consultar, limpiar: () => { ultimo.current = ""; setEstado({ fase: "libre" }); } };
}

const FUENTE: Record<string, string> = { DNI: "RENIEC", RUC: "SUNAT" };

export function AvisoConsulta({ estado, tipo }: { estado: Estado; tipo: string }) {
  if (estado.fase === "libre") return null;
  if (estado.fase === "consultando") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-stone-500" role="status">
        <Loader2 className="size-3.5 animate-spin" /> Consultando {FUENTE[tipo] ?? "el padrón"}…
      </p>
    );
  }
  if (estado.fase === "error") {
    return <p className="flex items-start gap-1.5 text-xs text-amber-700" role="status"><TriangleAlert className="mt-px size-3.5 shrink-0" />{estado.mensaje}</p>;
  }

  const d = estado.datos;
  if (d.registrado) {
    const href = { proveedor: "/proveedores", comprador: "/compradores", socio: "/socios" }[d.registrado.tipo] + `/${d.registrado.id}`;
    return (
      <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900" role="status">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>
          Ya está registrado como <b>{d.registrado.nombre}</b>.{" "}
          <Link href={href} className="font-medium underline">Ver ficha</Link>
        </span>
      </p>
    );
  }
  const inactivo = (d.estado && d.estado.toUpperCase() !== "ACTIVO") || (d.condicion && d.condicion.toUpperCase() !== "HABIDO");
  return (
    <div className="space-y-1" role="status">
      <p className={cx("flex items-center gap-1.5 text-xs", d.origen === "consulta" ? "text-emerald-700" : "text-stone-600")}>
        <CheckCircle2 className="size-3.5 shrink-0" />
        {d.origen === "consulta" && `Datos de ${FUENTE[tipo]}.`}
        {d.origen === "guardado" && `Datos de ${FUENTE[tipo]} ya guardados (no gastó consulta).`}
        {d.origen === "registrado" && `Datos tomados de otro registro de la empresa${d.telefono ? " (con su celular)" : ""} (no gastó consulta).`}
      </p>
      {inactivo && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-700">
          <TriangleAlert className="size-3.5 shrink-0" /> SUNAT: {d.estado ?? "—"} · {d.condicion ?? "—"}. Verifique antes de operar.
        </p>
      )}
    </div>
  );
}
