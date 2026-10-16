import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

// Consulta de nombre por DNI (RENIEC) o razón social por RUC (SUNAT) vía proveedor externo.
// Compatible con apis.net.pe v2. Sin CONSULTA_DOC_TOKEN responde 501 y la UI pide ingreso manual.
export async function GET(request: Request) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const token = process.env.CONSULTA_DOC_TOKEN;
  if (!token) return NextResponse.json({ error: "Consulta no configurada" }, { status: 501 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const numero = searchParams.get("numero") ?? "";
  const valido = (tipo === "DNI" && /^\d{8}$/.test(numero)) || (tipo === "RUC" && /^\d{11}$/.test(numero));
  if (!valido) return NextResponse.json({ error: "Documento inválido" }, { status: 400 });

  const base = process.env.CONSULTA_DOC_URL ?? "https://api.apis.net.pe/v2";
  const url = tipo === "DNI" ? `${base}/reniec/dni?numero=${numero}` : `${base}/sunat/ruc?numero=${numero}`;

  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const d = await r.json();
    const nombre =
      tipo === "DNI"
        ? d.nombreCompleto ?? [d.nombres, d.apellidoPaterno, d.apellidoMaterno].filter(Boolean).join(" ")
        : d.razonSocial ?? d.nombre;
    return NextResponse.json({ nombre: nombre ?? null, direccion: d.direccion ?? null });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 502 });
  }
}
