import { BotonCerrarSesion } from "@/components/shell/cerrar-sesion";

export default function SinEmpresa() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-sm rounded-2xl border border-stone-200 bg-superficie p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Su usuario no tiene empresa asignada</h1>
        <p className="mt-2 text-sm text-stone-500">
          Pida a Gerencia que lo agregue en Configuración → Usuarios.
        </p>
        <div className="mx-auto mt-4 w-fit">
          <BotonCerrarSesion className="inline-flex items-center gap-2 text-sm font-medium text-marca-700 hover:underline" />
        </div>
      </div>
    </main>
  );
}
