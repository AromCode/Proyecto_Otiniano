/**
 * Ruta interna segura para redirigir (parámetro `next`). Rechaza todo lo que el navegador resolvería fuera del
 * sitio: `//otro.com`, `/\otro.com` (la barra invertida cuenta como `/`) o URLs absolutas.
 */
export function destinoSeguro(v: string | null | undefined, porDefecto = "/"): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return porDefecto;
  try {
    const u = new URL(v, "http://local");
    return u.origin === "http://local" ? u.pathname + u.search + u.hash : porDefecto;
  } catch {
    return porDefecto;
  }
}
