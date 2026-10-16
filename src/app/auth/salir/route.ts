import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
