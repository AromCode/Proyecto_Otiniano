import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { crearClienteServidor } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/destino";

// Destino del enlace que llega por correo («¿Olvidó su contraseña?»). Canjea el código por una sesión y
// lleva a /restablecer para crear la nueva contraseña. Acepta el flujo PKCE (?code=) y el de plantilla
// con token (?token_hash=&type=). Si el enlace venció o ya se usó, vuelve al login con aviso.
export async function GET(request: Request) {
  const u = new URL(request.url);
  const code = u.searchParams.get("code");
  const tokenHash = u.searchParams.get("token_hash");
  const tipo = u.searchParams.get("type") as EmailOtpType | null;
  const next = destinoSeguro(u.searchParams.get("next"), "/restablecer");

  const supabase = await crearClienteServidor();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && tipo
      ? await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
      : { error: new Error("enlace sin código") };

  const url = new URL(error ? "/login" : next, request.url);
  if (error) url.searchParams.set("enlace", "vencido");
  return NextResponse.redirect(url, { status: 303 });
}
