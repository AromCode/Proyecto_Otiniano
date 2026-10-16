import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Metales · Compra y venta",
    short_name: "Metales",
    description: "Registro de compras en mostrador, inventario, caja y resultados.",
    start_url: "/comprar",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f5f4",
    theme_color: "#a85219",
    lang: "es-PE",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
