import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { COOKIE_LETRA, COOKIE_TEMA, clasesHtml, leerLetra, leerTema } from "@/lib/preferencias";
import { ProveedorNotificaciones } from "@/components/ui/notificaciones";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Otiniano", template: "%s · Otiniano" },
  description: "Compra y venta de metales: caja, inventario y resultados.",
  applicationName: "Otiniano",
  appleWebApp: { capable: true, title: "Otiniano", statusBarStyle: "default" },
  icons: { icon: "/icon.png", apple: "/iconos/apple-180.png" },
};

export const viewport: Viewport = {
  themeColor: "#1a5ca8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const c = await cookies();
  const clases = clasesHtml(leerTema(c.get(COOKIE_TEMA)?.value), leerLetra(c.get(COOKIE_LETRA)?.value));
  return (
    <html lang="es-PE" className={clases || undefined}>
      <head>
        {/* Guarda la oferta de instalación (PWA) aunque llegue antes de que cargue el botón "Instalar" */}
        <script dangerouslySetInnerHTML={{ __html: "addEventListener(\"beforeinstallprompt\",function(e){e.preventDefault();window.__instalar=e})" }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ProveedorNotificaciones>{children}</ProveedorNotificaciones>
      </body>
    </html>
  );
}
