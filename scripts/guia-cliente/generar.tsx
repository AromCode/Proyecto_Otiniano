// Genera la guía del sistema para presentar al cliente: pnpm guia  →  docs/Guia_del_Sistema_Metales.pdf
// El texto está en contenido.ts (actualizarlo cuando cambie el sistema); la maqueta en plantilla.tsx.
import { mkdirSync } from "node:fs";
import { renderToFile } from "@react-pdf/renderer";
import { CAPITULOS } from "./contenido";
import { Guia } from "./plantilla";

const salida = "docs/Guia_del_Sistema_Metales.pdf";
const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" }).format(new Date());

mkdirSync("docs", { recursive: true });
renderToFile(<Guia capitulos={CAPITULOS} fecha={fecha} />, salida).then(() => console.log(`Guía generada: ${salida}`));
