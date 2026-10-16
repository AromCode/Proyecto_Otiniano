export default function SinEmpresa() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Su usuario no tiene empresa asignada</h1>
        <p className="mt-2 text-sm text-stone-500">
          Pida al dueño del negocio que lo agregue en Configuración → Usuarios.
        </p>
        <form action="/auth/salir" method="post" className="mt-4">
          <button className="text-sm font-medium text-marca-700 hover:underline">Cerrar sesión</button>
        </form>
      </div>
    </main>
  );
}
