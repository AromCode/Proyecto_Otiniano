"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_EMPRESA } from "@/lib/contexto";

export async function cambiarEmpresa(fd: FormData) {
  const id = String(fd.get("empresa_id") ?? "");
  // La RLS impide ver datos de una empresa a la que no se pertenece; aquí solo se recuerda la elección.
  (await cookies()).set(COOKIE_EMPRESA, id, {
    path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}
