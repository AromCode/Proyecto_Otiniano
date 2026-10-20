// Genera los PDF reales para detectar errores de maquetación en tiempo de ejecución.
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { TicketPdf } from "@/lib/pdf/ticket";
import { ReportePdf } from "@/lib/pdf/reporte";
import { ValorizadoPdf } from "@/lib/pdf/valorizado";
import { ComprobantePdf, datosCompra, datosVenta } from "@/lib/pdf/comprobante";
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

  it("comprobante A4 de compra con marca (con descuento a favor)", async () => {
    const pdf = await renderToBuffer(
      <ComprobantePdf d={datosCompra(
        { empresa: { razon_social: "Metales Otiniano SAC", ruc: "20123456789", direccion: "Av. Perú 123", telefono: null } },
        { numero: 17, fecha: new Date().toISOString(), estado: "registrada", total: "300.00", kg_total: "10.000", saldo_aplicado: "151.60",
          medio_pago: "efectivo", caja_nombre: "Caja chica", proveedor_nombre: "María Huamán", proveedor_tipo_doc: "DNI", proveedor_nro_doc: "12345678", notas: "Con tierra" },
        [{ metal_nombre: "Cobre", metal_color: "#c2621f", peso_bruto_kg: "10.500", descuento_kg: "0.500", peso_neto_kg: "10.000", precio_kg: "30.00", importe: "300.00" }],
      )} />,
    );
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("nota de salida A4 (venta pendiente, sin pesaje del comprador)", async () => {
    const d = datosVenta(
      { empresa: { razon_social: "Metales Otiniano SAC", ruc: null, direccion: null, telefono: null } },
      { numero: 6, fecha: new Date().toISOString(), fecha_confirmacion: null, estado: "pendiente", total: null, kg_salida: "2000.000", kg_recibido: null,
        merma_kg: null, medio_pago: null, caja_nombre: null, comprador_nombre: "Fundición SAC", comprador_ruc: "20999999991", guia_numero: "T001-123", notas: null },
      [{ metal_nombre: "Aluminio", metal_color: null, peso_salida_kg: "2000.000", peso_recibido_kg: null, merma_kg: null, precio_kg: null, importe: null }],
    );
    expect(d.titulo).toBe("Nota de salida");
    expect(d.total.valor).toBe("Por confirmar");
    const pdf = await renderToBuffer(<ComprobantePdf d={d} />);
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

  it("inventario valorizado con marca (sin logo: iniciales)", async () => {
    const pdf = await renderToBuffer(
      <ValorizadoPdf d={{
        empresa: { razon_social: "Metales Otiniano SAC", ruc: "20123456789", direccion: "Av. Perú 123", telefono: "999888777" },
        logo: null, generado: new Date(), usuario: "Dueño",
        totales: { kg: 150.5, valor_costo: 3200.4, valor_venta: 3800, ganancia: 599.6, en_transito: 120, por_cobrar: 45 },
        metales: [
          { nombre: "Cobre", color: "#c2621f", kg: 100.5, costo_promedio: 30.1234, valor_costo: 3027.4, precio_venta: 34.5, valor_venta: 3467.25 },
          { nombre: "Fierro", color: null, kg: 50, costo_promedio: null, valor_costo: 173, precio_venta: 6.62, valor_venta: 332.75 },
        ],
        lotes: [{ fecha: new Date().toISOString(), numero: 3, proveedor: "Juan Pérez", metal: "Cobre", color: "#c2621f", kg_en_stock: 20, dias: 5, por_seleccionar: true, retrasado: true }],
      }} />,
    );
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
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
