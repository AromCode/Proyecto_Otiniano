import { AppShell } from "@/components/shell/app-shell";
import { obtenerContexto } from "@/lib/contexto";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await obtenerContexto();
  return (
    <AppShell
      rol={ctx.rol}
      nombre={ctx.nombre}
      empresa={{ id: ctx.empresa.id, razon_social: ctx.empresa.razon_social }}
      empresas={ctx.empresas}
    >
      {children}
    </AppShell>
  );
}
