import { Esqueleto, EsqueletoFormulario } from "@/components/ui/esqueleto";

export default function Cargando() {
  return (
    <div role="status" aria-label="Cargando" className="mx-auto max-w-2xl">
      <Esqueleto className="mb-4 h-8 w-40" />
      <EsqueletoFormulario />
    </div>
  );
}
