import type { MetadataRoute } from "next";

// PWA instalable (Chrome/Edge en PC y Android; Safari con "Agregar a inicio" / "Agregar al Dock").
// Íconos PNG en public/iconos (generados desde Logotipos/isotipo_color.png). El service worker está en public/sw.js.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sistema Otiniano · Compra y venta de metales",
    short_name: "Otiniano",
    description: "Registro de compras en mostrador, inventario, caja y resultados.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#1a5ca8",
    lang: "es-PE",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.png", sizes: "64x64", type: "image/png", purpose: "any" },
    ],
    // Accesos al hacer clic derecho en el ícono instalado (barra de tareas / dock)
    shortcuts: [
      { name: "Nueva compra", url: "/comprar", icons: [{ src: "/iconos/icono-192.png", sizes: "192x192" }] },
      { name: "Nueva venta", url: "/vender", icons: [{ src: "/iconos/icono-192.png", sizes: "192x192" }] },
      { name: "Caja", url: "/caja", icons: [{ src: "/iconos/icono-192.png", sizes: "192x192" }] },
    ],
  };
}
