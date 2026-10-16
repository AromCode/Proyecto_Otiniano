import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm font-medium text-marca-700">404</p>
        <h1 className="mt-1 text-xl font-semibold">No encontramos esa página</h1>
        <p className="mt-1 text-sm text-stone-500">Puede que el registro no exista o sea de otra empresa.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-marca-700 hover:underline">Ir al inicio</Link>
      </div>
    </main>
  );
}
