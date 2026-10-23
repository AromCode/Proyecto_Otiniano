"use server";

import { obtenerContexto } from "@/lib/contexto";
import { fallo, ok, texto } from "@/lib/acciones";
import type { ClaseProveedor, Proveedor, Resultado, TipoDoc } from "@/lib/tipos";

export async function buscarProveedores(q: string): Promise<Proveedor[]> {
  const { supabase, empresa } = await obtenerContexto();
  const t = q.trim();
  if (t.length < 2) return [];
  let consulta = supabase
    .from("proveedores")
    .select("id, tipo_doc, nro_doc, nombre, telefono, direccion, activo, clase")
    .eq("empresa_id", empresa.id)
    .eq("activo", true)
    .limit(8);
  consulta = /^\d+$/.test(t)
    ? consulta.like("nro_doc", `${t}%`)
    : consulta.ilike("nombre", `%${t.replace(/[%_]/g, "")}%`);
  const { data } = await consulta.order("nombre");
  return (data ?? []) as Proveedor[];
}

function leerProveedor(fd: FormData) {
  const tipo = (texto(fd, "tipo_doc") ?? "DNI") as TipoDoc;
  return {
    tipo_doc: tipo,
    nro_doc: tipo === "SIN_DOC" ? null : texto(fd, "nro_doc"),
    nombre: texto(fd, "nombre"),
    telefono: texto(fd, "telefono"),
    direccion: texto(fd, "direccion"),
    notas: texto(fd, "notas"),
    clase: (texto(fd, "clase") === "mayorista" ? "mayorista" : "minorista") as ClaseProveedor,
  };
}

function validar(p: ReturnType<typeof leerProveedor>): string | null {
  if (!p.nombre) return "Ingrese el nombre.";
  if (p.tipo_doc === "DNI" && !/^\d{8}$/.test(p.nro_doc ?? "")) return "El DNI debe tener 8 dígitos.";
  if (p.tipo_doc === "RUC" && !/^\d{11}$/.test(p.nro_doc ?? "")) return "El RUC debe tener 11 dígitos.";
  if (p.tipo_doc === "CE" && !p.nro_doc) return "Ingrese el número de carné de extranjería.";
  return null;
}

export async function crearProveedor(_: unknown, fd: FormData): Promise<Resultado<Proveedor>> {
  const { supabase, empresa } = await obtenerContexto();
  const p = leerProveedor(fd);
  const error = validar(p);
  if (error) return fallo(error);
  const { data, error: e } = await supabase
    .from("proveedores")
    .insert({ ...p, empresa_id: empresa.id })
    .select("id, tipo_doc, nro_doc, nombre, telefono, direccion, activo, clase")
    .single();
  if (e) return fallo(e);
  return ok(data as Proveedor);
}

export async function actualizarProveedor(_: unknown, fd: FormData): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const id = texto(fd, "id");
  const p = leerProveedor(fd);
  const error = validar(p);
  if (error) return fallo(error);
  const { error: e, count } = await supabase.from("proveedores").update(p, { count: "exact" }).eq("id", id!);
  if (e) return fallo(e);
  if (!count) return fallo("No tiene permiso para editar proveedores.");
  return ok(null);
}

export async function cambiarEstadoProveedor(id: string, activo: boolean): Promise<Resultado> {
  const { supabase } = await obtenerContexto();
  const { error, count } = await supabase.from("proveedores").update({ activo }, { count: "exact" }).eq("id", id);
  if (error) return fallo(error);
  if (!count) return fallo("No tiene permiso para esta operación.");
  return ok(null);
}
