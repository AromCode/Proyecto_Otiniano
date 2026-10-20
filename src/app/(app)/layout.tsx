import { AppShell } from "@/components/shell/app-shell";
import { cookies } from "next/headers";
import { obtenerContexto } from "@/lib/contexto";
import { COOKIE_LETRA, COOKIE_MENU, COOKIE_TEMA, leerLetra, leerMenuCompacto, leerTema } from "@/lib/preferencias";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [ctx, c] = await Promise.all([obtenerContexto(), cookies()]);
  return (
    <AppShell
      rol={ctx.rol}
      nombre={ctx.nombre}
      empresa={{ id: ctx.empresa.id, razon_social: ctx.empresa.razon_social }}
      empresas={ctx.empresas}
      tema={leerTema(c.get(COOKIE_TEMA)?.value)}
      letra={leerLetra(c.get(COOKIE_LETRA)?.value)}
      compacto={leerMenuCompacto(c.get(COOKIE_MENU)?.value)}
    >
      {children}
    </AppShell>
  );
}
