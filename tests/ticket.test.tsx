// Tickets HTML de 80 mm (impresión directa en la térmica): se arman sin errores y muestran lo clave.
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Cierre80 } from "@/components/ticket/cierre-80";
import type { ResumenTurno } from "@/lib/tipos";

const empresa = { razon_social: "Metales Demo SAC", ruc: "20123456789", direccion: "Av. Industrial 123", telefono: null };
const base: ResumenTurno = {
  id: "t1", numero: 3, caja: "Caja principal", caja_id: "c1",
  abierto_en: "2026-10-20T13:00:00Z", abierto_por: "Cajero Uno", cerrado_en: "2026-10-20T23:00:00Z", cerrado_por: "Cajero Uno",
  saldo_apertura: 500, contado_apertura: 500, diferencia_apertura: 0,
  ingresos: 1200, egresos: 950.5, esperado: 749.5, otros: 0, saldo_sistema: 749.5,
  contado_cierre: 744.5, diferencia_cierre: -5, ajustado: false, nota_apertura: null, nota_cierre: "Vuelto mal dado",
  anulados: 1,
  detalle: [
    { origen: "venta", tipo: "ingreso", cantidad: 1, monto: 1200 },
    { origen: "compra", tipo: "egreso", cantidad: 4, monto: 900.5 },
    { origen: "gasto", tipo: "egreso", cantidad: 1, monto: 50 },
  ],
};

describe("Ticket de cierre de caja (80 mm)", () => {
  it("cierre: resumen por origen, faltante y firmas", () => {
    const html = renderToStaticMarkup(<Cierre80 r={base} empresa={empresa} />);
    if (process.env.TICKET_HTML) writeFileSync(process.env.TICKET_HTML, `<!doctype html><meta charset="utf-8">${html}`);
    expect(html).toContain("CIERRE DE CAJA");
    expect(html).toContain("Compra (4)");
    expect(html).toContain("FALTANTE");
    expect(html).toContain("Supervisor");
    expect(html).not.toContain("CORTE PARCIAL");
  });

  it("turno abierto: corte parcial sin contado ni diferencia", () => {
    const html = renderToStaticMarkup(
      <Cierre80 r={{ ...base, cerrado_en: null, cerrado_por: null, contado_cierre: null, diferencia_cierre: null }} empresa={empresa} />);
    expect(html).toContain("CORTE PARCIAL");
    expect(html).not.toContain("CONTADO");
    expect(html).not.toContain("FALTANTE");
  });
});
