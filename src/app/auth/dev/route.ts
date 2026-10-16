import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { COOKIE_EMPRESA } from "@/lib/contexto";
import { correosDev } from "@/lib/dev-login";

// Acceso directo SOLO EN DESARROLLO (pnpm dev). En producción responde 404.
// Genera un enlace mágico con service_role para DEV_LOGIN_EMAIL y lo canjea en el servidor:
// no necesita contraseña, así que sigue funcionando aunque el usuario la cambie.
export async function POST(request: Request) {
  const permitidos = correosDev();
  const pedido = String((await request.formData().catch(() => null))?.get("email") ?? "").toLowerCase();
  const email = pedido ? permitidos.find((e) => e === pedido) : permitidos[0];
  if (process.env.NODE_ENV !== "development" || !email) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const { data, error } = await crearClienteAdmin().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    return new NextResponse(`Acceso directo falló: ${error?.message ?? "sin token"}`, { status: 500 });
  }

  const supabase = await crearClienteServidor();
  const { error: e2 } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
  if (e2) return new NextResponse(`Acceso directo falló: ${e2.message}`, { status: 500 });

  // Abrir en la empresa demo (DEV_LOGIN_EMPRESA, por defecto la que contenga "Demo" en el nombre)
  const filtro = process.env.DEV_LOGIN_EMPRESA ?? "Demo";
  const { data: emp } = await supabase.from("empresas").select("id").ilike("razon_social", `%${filtro}%`).limit(1).maybeSingle();

  const respuesta = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  if (emp) {
    respuesta.cookies.set(COOKIE_EMPRESA, emp.id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  return respuesta;
}
