import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { COOKIE_LETRA, COOKIE_TEMA, clasesHtml, leerLetra, leerTema } from "@/lib/preferencias";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Metales", template: "%s · Metales" },
  description: "Compra y venta de metales: caja, inventario y resultados.",
  applicationName: "Metales",
  appleWebApp: { capable: true, title: "Metales", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#a85219",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const c = await cookies();
  const clases = clasesHtml(leerTema(c.get(COOKIE_TEMA)?.value), leerLetra(c.get(COOKIE_LETRA)?.value));
  return (
    <html lang="es-PE" className={clases || undefined}>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
