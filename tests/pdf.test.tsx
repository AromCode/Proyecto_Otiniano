// Genera los PDF reales para detectar errores de maquetación en tiempo de ejecución.
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { TicketPdf } from "@/lib/pdf/ticket";
import { ReportePdf } from "@/lib/pdf/reporte";
import { aCentimos, aGramos, importeCentimos } from "@/lib/montos";

describe("PDF", () => {
  it("ticket de compra de 80 mm", async () => {
    const pdf = await renderToBuffer(
      <TicketPdf d={{
        titulo: "Compra", numero: 12, fecha: new Date().toISOString(), contraparte: "Juan Pérez Ñahui",
        documento: "DNI 12345678", medio_pago: "efectivo", estado: "registrada", total: "150.00", notas: "Cobre con tierra",
        empresa: { razon_social: "Metales Otiniano SAC", ruc: "20123456789", direccion: "Av. Perú 123", telefono: null },
        items: [{ metal: "Cobre", bruto: "5.250", descuento: "0.250", neto: "5.000", precio: "30.00", importe: "150.00" }],
      }} />,
    );
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("reporte A4", async () => {
    const pdf = await renderToBuffer(
      <ReportePdf empresa="Metales" titulo="Compras" subtitulo="Del 01/10 al 16/10"
        columnas={[{ titulo: "Grupo", derecha: false, ancho: 30 }, { titulo: "Kg", derecha: true, ancho: 13 }]}
        filas={[{ celdas: ["Cobre", "5,000 kg"] }]} total={["Total", "5,000 kg"]} nota="Nota" />,
    );
    expect(pdf.length).toBeGreaterThan(1000);
  });
});

describe("Cálculo en vivo del formulario (enteros)", () => {
  it("coincide con el caso de prueba 1", () => {
    const neto = aGramos("5.250") - aGramos("0,250");
    expect(neto).toBe(5000);
    expect(importeCentimos(neto, aCentimos("30"))).toBe(15000);
  });
  it("redondea al céntimo como Postgres", () => {
    expect(importeCentimos(aGramos("1.235"), aCentimos("10.50"))).toBe(1297); // 12.9675 → 12.97
  });
});
