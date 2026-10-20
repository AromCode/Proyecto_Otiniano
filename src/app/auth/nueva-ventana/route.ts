import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

// Pestaña o ventana nueva (o la app instalada recién abierta) con una sesión que viene de antes:
// se cierra la sesión SOLO en este navegador (scope "local": otros equipos siguen conectados) y se
// pide el login. La decisión la toma el script de app/(app)/layout.tsx con sessionStorage.
export async function GET(request: Request) {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
  const pedido = new URL(request.url).searchParams.get("next") ?? "/";
  const url = new URL("/login", request.url);
  if (pedido.startsWith("/") && !pedido.startsWith("//") && pedido !== "/") url.searchParams.set("next", pedido);
  return NextResponse.redirect(url, { status: 303 });
}
