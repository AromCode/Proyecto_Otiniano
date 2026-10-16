import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Cliente con service_role: SOLO para tareas administrativas en el servidor (alta de usuarios). */
export function crearClienteAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
