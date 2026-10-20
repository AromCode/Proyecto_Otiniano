import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

// Respaldo del login cuando el formulario se envía sin JavaScript (página aún cargando o señal lenta):
// la contraseña viaja por POST, nunca en la URL. Con JavaScript lo resuelve form-login.tsx en el navegador.
export async function POST(request: Request) {
  const fd = await request.formData().catch(() => null);
  const email = String(fd?.get("email") ?? "").trim().toLowerCase();
  const password = String(fd?.get("password") ?? "");
  const pedido = String(fd?.get("next") ?? "/");
  const next = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";

  const supabase = await crearClienteServidor();
  const { error } = email && password
    ? await supabase.auth.signInWithPassword({ email, password })
    : { error: new Error("faltan datos") };

  const url = new URL(error ? "/login" : "/bienvenida", request.url);
  if (error) url.searchParams.set("error", "1");
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url, { status: 303 });
}
