import { Scale, ShieldCheck, Warehouse } from "lucide-react";

// Escena de entrada (login y cambio de contraseña): fondo oscuro de marca con rejilla hexagonal en movimiento,
// brillos y chispas, y el isotipo que se arma con sus dos mitades. Colores fijos: se ve igual en claro y oscuro.
// Las animaciones viven en globals.css (sección «Escena de marca») y se apagan con prefers-reduced-motion.

const PUNTOS = [
  { icono: Scale, texto: "Compras pesadas al instante, con ticket para el proveedor." },
  { icono: Warehouse, texto: "Stock real por producto: lo que dice el sistema es lo que hay." },
  { icono: ShieldCheck, texto: "Caja cuadrada al céntimo; nada se borra, todo queda registrado." },
];

// Posiciones fijas (no aleatorias) para que el HTML del servidor y del navegador coincida
const CHISPAS = [
  [6, 0, 9], [14, 3.2, 12], [23, 6.5, 10], [31, 1.4, 14], [42, 8.1, 11], [51, 2.6, 13], [58, 5.3, 9.5],
  [67, 0.8, 12.5], [74, 7.2, 10.5], [83, 3.9, 13.5], [91, 1.9, 11.5], [97, 6.1, 12],
] as const;

function Isotipo({ className }: { className?: string }) {
  return (
    <div className={`iso relative aspect-[336/371] ${className ?? ""}`} aria-hidden>
      <svg viewBox="0 0 100 100" className="iso-halo absolute -inset-[22%] size-[144%]">
        <polygon points="50,2 93,26 93,74 50,98 7,74 7,26" fill="none" stroke="url(#halo)" strokeWidth="0.6" strokeDasharray="3 5" />
        <defs>
          <linearGradient id="halo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22c0f8" />
            <stop offset="1" stopColor="#1a5ca8" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
      <span className="iso-resplandor absolute inset-[8%] rounded-full" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marca/isotipo.png" alt="" className="iso-izq absolute inset-0 size-full" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marca/isotipo.png" alt="" className="iso-der absolute inset-0 size-full" />
      <span className="iso-brillo absolute inset-0" />
    </div>
  );
}

export function EscenaMarca({ children }: { children: React.ReactNode }) {
  return (
    <main className="escena relative isolate min-h-dvh overflow-hidden bg-[#050b16] text-white">
      {/* Fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="escena-rejilla absolute inset-0" />
        <div className="escena-orbe absolute -left-40 -top-40 size-[44rem] rounded-full [--orbe:rgb(26_92_168/0.5)]" />
        <div className="escena-orbe escena-orbe-2 absolute -bottom-48 right-[-10rem] size-[48rem] rounded-full [--orbe:rgb(34_192_248/0.28)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#050b16_85%)]" />
        {CHISPAS.map(([x, retraso, dura]) => (
          <span key={x} className="chispa absolute bottom-0 size-1 rounded-full bg-[#7fd8fb]"
            style={{ left: `${x}%`, "--retraso": `${retraso}s`, "--dura": `${dura}s` } as React.CSSProperties} />
        ))}
      </div>

      <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-5 px-4 py-5 sm:gap-8 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        {/* Marca */}
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <Isotipo className="w-12 sm:w-20 lg:w-40" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/logotipo-blanco.png" alt="Grupo Otiniano"
            className="escalonado mt-3 h-8 w-auto sm:mt-5 sm:h-11 lg:mt-10 lg:h-14" style={{ "--retraso": "0.55s" } as React.CSSProperties} />
          <p className="escalonado mt-3 hidden text-xs font-semibold sm:block uppercase tracking-[0.25em] text-[#7fd8fb]"
            style={{ "--retraso": "0.7s" } as React.CSSProperties}>
            Sistema de reciclaje · compra y venta de metales
          </p>
          <h2 className="escalonado texto-metal mt-6 hidden max-w-md text-4xl font-semibold leading-tight tracking-tight lg:block"
            style={{ "--retraso": "0.85s" } as React.CSSProperties}>
            Cada kilo y cada sol, bajo control.
          </h2>
          <ul className="mt-8 hidden space-y-4 lg:block">
            {PUNTOS.map((p, i) => (
              <li key={p.texto} className="escalonado flex items-start gap-3" style={{ "--retraso": `${1 + i * 0.12}s` } as React.CSSProperties}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#7fd8fb]">
                  <p.icono className="size-[18px]" />
                </span>
                <span className="pt-1.5 text-sm text-white/75">{p.texto}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Formulario */}
        <section className="escalonado mx-auto w-full max-w-md" style={{ "--retraso": "0.15s" } as React.CSSProperties}>
          {children}
          <p className="mt-6 text-center text-xs text-white/60">© {new Date().getFullYear()} Grupo Otiniano</p>
        </section>
      </div>
    </main>
  );
}
