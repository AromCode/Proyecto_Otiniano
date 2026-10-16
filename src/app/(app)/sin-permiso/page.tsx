import { BotonLink } from "@/components/ui/boton";

export default function SinPermiso() {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <h1 className="text-lg font-semibold">Su rol no tiene acceso a esta sección</h1>
      <p className="mt-2 text-sm text-stone-500">Si lo necesita, pídale al dueño que cambie su rol.</p>
      <BotonLink href="/compras" variante="secundario" className="mt-4">Ir a compras</BotonLink>
    </div>
  );
}
