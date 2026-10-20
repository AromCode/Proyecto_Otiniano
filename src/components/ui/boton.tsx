import Link from "next/link";
import { IndicadorNavegacion } from "@/components/shell/indicador-navegacion";
import { claseBoton, type Tamano, type Variante } from "./clases";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamano?: Tamano };

export function Boton({ variante, tamano, className, type = "button", ...rest }: Props) {
  return <button type={type} className={claseBoton(variante, tamano, className)} {...rest} />;
}

export function BotonLink({
  href, variante, tamano, className, children,
}: { href: string; variante?: Variante; tamano?: Tamano; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={claseBoton(variante, tamano, className)}>
      {children}
      <IndicadorNavegacion />
    </Link>
  );
}
