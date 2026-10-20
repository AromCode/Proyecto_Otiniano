import { NextResponse } from "next/server";
import { obtenerContexto } from "@/lib/contexto";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

// Nombre por DNI (RENIEC) o razón social por RUC (SUNAT) vía Decolecta (sucesor de apis.net.pe).
// Para no gastar la cuota, cada documento se consulta UNA sola vez:
//   1) si ya está registrado en la empresa (proveedor o cliente) se usan esos datos;
//   2) si ya se consultó antes (cualquier empresa), sale de padron_documentos;
//   3) solo si es nuevo se llama a la API y se guarda la respuesta.
// Sin CONSULTA_DOC_TOKEN responde 501 y la UI pide ingreso manual.

type Tipo = "DNI" | "RUC";
interface Respuesta {
  nombre: string | null;
  direccion: string | null;
  /** Solo si la persona ya está en el sistema (RENIEC/SUNAT nunca dan teléfonos) */
  telefono?: string | null;
  estado?: string | null;
  condicion?: string | null;
  /** registrado = ya existe en esta empresa; guardado = consulta previa; consulta = se gastó una consulta */
  origen: "registrado" | "guardado" | "consulta";
  registrado?: { tipo: "proveedor" | "comprador" | "socio"; id: string; nombre: string } | null;
}

const NEGATIVO_DIAS = 7; // un documento no encontrado se vuelve a consultar recién después de estos días

const titulo = (t: string) => t.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

function leerDecolecta(tipo: Tipo, d: Record<string, unknown>) {
  const s = (k: string) => (typeof d[k] === "string" && (d[k] as string).trim() ? (d[k] as string).trim() : null);
  if (tipo === "DNI") {
    const partes = [s("first_name") ?? s("nombres"), s("first_last_name") ?? s("apellidoPaterno"), s("second_last_name") ?? s("apellidoMaterno")]
      .filter(Boolean).join(" ");
    const nombre = partes || s("full_name") || s("nombreCompleto");
    return { nombre: nombre ? titulo(nombre) : null, direccion: null, estado: null, condicion: null };
  }
  const base = s("direccion");
  const lugar = [s("distrito"), s("provincia"), s("departamento")].filter(Boolean).join(" - ");
  const direccion = base && lugar && !base.includes(lugar) ? `${base}, ${lugar}` : base;
  return {
    nombre: s("razon_social") ?? s("razonSocial") ?? s("nombre"),
    direccion: direccion && direccion !== "-" ? direccion : null,
    estado: s("estado"),
    condicion: s("condicion"),
  };
}

export async function GET(request: Request) {
  const { supabase, empresa, userId } = await obtenerContexto();
  const sp = new URL(request.url).searchParams;
  const tipo = sp.get("tipo") as Tipo | null;
  const numero = (sp.get("numero") ?? "").trim();
  const para = sp.get("para") === "comprador" ? "comprador" : sp.get("para") === "socio" ? "socio" : "proveedor";
  const valido = (tipo === "DNI" && /^\d{8}$/.test(numero)) || (tipo === "RUC" && /^\d{11}$/.test(numero));
  if (!valido) return NextResponse.json({ error: tipo === "DNI" ? "El DNI debe tener 8 dígitos." : "El RUC debe tener 11 dígitos." }, { status: 400 });

  // 1) Ya registrado en esta empresa (como proveedor, cliente o socio): sin consulta y con sus datos completos
  const [{ data: prov }, { data: comp }, { data: soc }] = await Promise.all([
    supabase.from("proveedores").select("id, nombre, direccion, telefono").eq("empresa_id", empresa.id)
      .eq("tipo_doc", tipo).eq("nro_doc", numero).maybeSingle(),
    tipo === "RUC"
      ? supabase.from("compradores").select("id, razon_social, direccion, telefono").eq("empresa_id", empresa.id).eq("ruc", numero).maybeSingle()
      : Promise.resolve({ data: null }),
    tipo === "DNI"
      ? supabase.from("socios").select("id, nombre").eq("empresa_id", empresa.id).eq("dni", numero).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const mismo = para === "proveedor"
    ? prov && { tipo: "proveedor" as const, id: prov.id, nombre: prov.nombre }
    : para === "comprador"
      ? comp && { tipo: "comprador" as const, id: comp.id, nombre: comp.razon_social }
      : soc && { tipo: "socio" as const, id: soc.id, nombre: soc.nombre };
  if (prov || comp || soc) {
    return NextResponse.json({
      nombre: prov?.nombre ?? comp?.razon_social ?? soc?.nombre ?? null,
      direccion: prov?.direccion ?? comp?.direccion ?? null,
      telefono: prov?.telefono ?? comp?.telefono ?? null,
      origen: "registrado",
      registrado: mismo || null,
    } satisfies Respuesta);
  }

  // 2) Consultado antes
  const admin = crearClienteAdmin();
  const { data: guardado } = await admin.from("padron_documentos").select("*").eq("tipo_doc", tipo).eq("nro_doc", numero).maybeSingle();
  if (guardado?.encontrado) {
    const d = (guardado.datos ?? {}) as Record<string, string | null>;
    return NextResponse.json({
      nombre: guardado.nombre, direccion: guardado.direccion, estado: d.estado ?? null, condicion: d.condicion ?? null, origen: "guardado",
    } satisfies Respuesta);
  }
  if (guardado && Date.now() - new Date(guardado.consultado_en).getTime() < NEGATIVO_DIAS * 86400_000) {
    return NextResponse.json({ error: `${tipo} no encontrado en ${tipo === "DNI" ? "RENIEC" : "SUNAT"}. Ingrese los datos a mano.` }, { status: 404 });
  }

  // 3) Consulta nueva (gasta cuota)
  const token = process.env.CONSULTA_DOC_TOKEN;
  if (!token) return NextResponse.json({ error: "Consulta no configurada" }, { status: 501 });

  const limite = Number(process.env.CONSULTA_DOC_LIMITE_DIA ?? 30);
  const { data: uso } = await supabase.rpc("uso_consultas_doc", { p_empresa: empresa.id });
  const hoy = Number((uso as { hoy?: number } | null)?.hoy ?? 0);
  if (limite > 0 && hoy >= limite) {
    return NextResponse.json({ error: `Se llegó al tope de ${limite} consultas nuevas por día. Ingrese los datos a mano.` }, { status: 429 });
  }

  const base = process.env.CONSULTA_DOC_URL ?? "https://api.decolecta.com/v1";
  const url = tipo === "DNI" ? `${base}/reniec/dni?numero=${numero}` : `${base}/sunat/ruc?numero=${numero}`;
  let r: Response;
  try {
    r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json({ error: "El servicio de RENIEC/SUNAT no responde. Intente de nuevo o ingrese los datos a mano." }, { status: 502 });
  }
  if (r.status === 401 || r.status === 403) {
    return NextResponse.json({ error: "El servicio de consulta rechazó la clave (revise CONSULTA_DOC_TOKEN)." }, { status: 502 });
  }
  if (r.status === 429) {
    return NextResponse.json({ error: "Se agotaron las consultas del servicio. Ingrese los datos a mano." }, { status: 429 });
  }

  const cuerpo = r.ok ? ((await r.json().catch(() => null)) as Record<string, unknown> | null) : null;
  const datos = cuerpo ? leerDecolecta(tipo, cuerpo) : null;
  const encontrado = !!datos?.nombre;
  if (!encontrado && r.status >= 500) {
    return NextResponse.json({ error: "El servicio de RENIEC/SUNAT falló. Intente de nuevo." }, { status: 502 });
  }

  await admin.from("padron_documentos").upsert({
    tipo_doc: tipo,
    nro_doc: numero,
    encontrado,
    nombre: datos?.nombre ?? null,
    direccion: datos?.direccion ?? null,
    datos: (cuerpo ?? null) as Json,
    consultas: (guardado?.consultas ?? 0) + 1,
    consultado_en: new Date().toISOString(),
    empresa_id: empresa.id,
    creado_por: userId,
  });

  if (!encontrado) {
    return NextResponse.json({ error: `${tipo} no encontrado en ${tipo === "DNI" ? "RENIEC" : "SUNAT"}. Ingrese los datos a mano.` }, { status: 404 });
  }
  return NextResponse.json({ ...datos!, origen: "consulta" } satisfies Respuesta);
}
