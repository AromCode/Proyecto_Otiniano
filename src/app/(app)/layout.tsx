import { AppShell } from "@/components/shell/app-shell";
import { cookies } from "next/headers";
import { obtenerContexto } from "@/lib/contexto";
import { COOKIE_LETRA, COOKIE_MENU, COOKIE_TEMA, leerLetra, leerMenuCompacto, leerTema } from "@/lib/preferencias";
import { CLAVE_PESTANA } from "@/lib/sesion-pestana";

// Cada pestaña nueva y cada apertura de la app instalada empiezan en el login: la marca de "esta pestaña
// pasó por el login" vive en sessionStorage (se pierde al abrir otra pestaña o ventana; sobrevive a recargar).
// Sin marca: se oculta la página antes de pintarla y se cierra la sesión local (/auth/nueva-ventana).
const GUARDIA = `try{if(!sessionStorage.getItem("${CLAVE_PESTANA}")){document.documentElement.style.visibility="hidden";location.replace("/auth/nueva-ventana?next="+encodeURIComponent(location.pathname+location.search))}}catch(e){}`;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [ctx, c] = await Promise.all([obtenerContexto(), cookies()]);
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: GUARDIA }} />
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
    </>
  );
}
