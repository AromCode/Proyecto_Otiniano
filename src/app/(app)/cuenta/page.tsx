import type { Metadata } from "next";
import { obtenerContexto } from "@/lib/contexto";
import { ETIQUETA_ROL } from "@/lib/formato";
import { Dato, Encabezado, Tarjeta, TituloTarjeta } from "@/components/ui/basicos";
import { cookies } from "next/headers";
import { COOKIE_LETRA, COOKIE_TEMA, leerLetra, leerTema } from "@/lib/preferencias";
import { PanelPreferencias } from "@/components/preferencias/preferencias";
import { FormClave } from "./form-clave";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const [{ email, nombre, rol, empresa }, c] = await Promise.all([obtenerContexto(), cookies()]);
  return (
    <div className="mx-auto max-w-lg">
      <Encabezado titulo="Mi cuenta" />
      <Tarjeta className="mb-4 p-4">
        <dl className="grid grid-cols-2 gap-3">
          <Dato etiqueta="Nombre">{nombre}</Dato>
          <Dato etiqueta="Correo">{email}</Dato>
          <Dato etiqueta="Empresa">{empresa.razon_social}</Dato>
          <Dato etiqueta="Rol">{ETIQUETA_ROL[rol]}</Dato>
        </dl>
      </Tarjeta>
      <Tarjeta className="mb-4">
        <TituloTarjeta>Vista</TituloTarjeta>
        <div className="p-4">
          <PanelPreferencias tema={leerTema(c.get(COOKIE_TEMA)?.value)} letra={leerLetra(c.get(COOKIE_LETRA)?.value)} />
        </div>
      </Tarjeta>
      <Tarjeta>
        <TituloTarjeta>Cambiar contraseña</TituloTarjeta>
        <div className="p-4"><FormClave /></div>
      </Tarjeta>
    </div>
  );
}
