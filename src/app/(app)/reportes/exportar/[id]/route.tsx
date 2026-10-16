import ExcelJS from "exceljs";
import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { REPORTES, filtrosDesde, totales, type Col } from "@/lib/reportes";
import { fecha, fechaHora, kg, numero, porcentaje, soles } from "@/lib/formato";
import { ReportePdf } from "@/lib/pdf/reporte";

export const runtime = "nodejs";

const FORMATO_EXCEL: Partial<Record<Col["tipo"], string>> = {
  soles: '"S/" #,##0.00;[Red]-"S/" #,##0.00',
  precio: '"S/" #,##0.00##',
  kg: "#,##0.000",
  num: "#,##0",
  pct: '0.00" %"',
  fecha: "dd/mm/yyyy hh:mm",
};
const ANCHO: Record<Col["tipo"], number> = { texto: 30, fecha: 16, soles: 14, precio: 13, kg: 13, num: 9, pct: 10 };

function texto(c: Col, v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  switch (c.tipo) {
    case "soles": return soles(v as string);
    case "precio": return `S/ ${Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    case "kg": return kg(v as string);
    case "num": return numero(v as string);
    case "pct": return porcentaje(v as string);
    case "fecha": return fechaHora(v as string);
    default: return String(v);
  }
}

function valorExcel(c: Col, v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  if (c.tipo === "texto") return String(v);
  if (c.tipo === "fecha") {
    // Excel no maneja zonas horarias: se escribe la hora de Lima como fecha "local"
    const d = new Date(v as string);
    return new Date(d.getTime() - 5 * 3600 * 1000);
  }
  return Number(v);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obtenerContexto();
  if (!puede(ctx.rol, "verReportes")) return new Response("Sin permiso", { status: 403 });
  const def = REPORTES.find((r) => r.id === id);
  if (!def) return new Response("Reporte no existe", { status: 404 });

  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const f = filtrosDesde(sp);
  const datos = await def.obtener(ctx, f);
  const t = totales(datos);
  const rango = def.id === "patrimonio" ? `Al ${fecha(new Date())}` : `Del ${fecha(`${f.desde}T12:00:00-05:00`)} al ${fecha(`${f.hasta}T12:00:00-05:00`)}`;
  const nombreArchivo = `${def.id}_${f.desde}_${f.hasta}`;

  if (sp.formato === "pdf") {
    const pdf = await renderToBuffer(
      <ReportePdf
        empresa={ctx.empresa.razon_social}
        titulo={def.titulo}
        subtitulo={rango}
        columnas={datos.columnas.map((c) => ({ titulo: c.titulo, derecha: c.tipo !== "texto" && c.tipo !== "fecha", ancho: ANCHO[c.tipo] }))}
        filas={datos.filas.map((r) => ({ celdas: datos.columnas.map((c) => texto(c, r[c.clave])), fuerte: Boolean(r._fuerte) }))}
        total={t ? datos.columnas.map((c, i) => (i === 0 ? "Total" : c.clave in t ? texto(c, t[c.clave]) : "")) : null}
        nota={datos.nota}
      />,
    );
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nombreArchivo}.pdf"` },
    });
  }

  const libro = new ExcelJS.Workbook();
  libro.creator = "Sistema Metales";
  const hoja = libro.addWorksheet(def.titulo.slice(0, 31));
  hoja.addRow([ctx.empresa.razon_social]).font = { bold: true, size: 12 };
  hoja.addRow([def.titulo]).font = { bold: true, size: 14 };
  hoja.addRow([rango]).font = { color: { argb: "FF57534E" } };
  hoja.addRow([]);
  const cab = hoja.addRow(datos.columnas.map((c) => c.titulo));
  cab.font = { bold: true };
  cab.eachCell((celda) => {
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F4" } };
    celda.border = { bottom: { style: "thin", color: { argb: "FFA8A29E" } } };
  });
  for (const r of datos.filas) {
    const fila = hoja.addRow(datos.columnas.map((c) => valorExcel(c, r[c.clave])));
    if (r._fuerte) fila.font = { bold: true };
  }
  if (t) {
    const fila = hoja.addRow(datos.columnas.map((c, i) => (i === 0 ? "Total" : c.clave in t ? t[c.clave] : null)));
    fila.font = { bold: true };
    fila.eachCell((celda) => { celda.border = { top: { style: "thin" } }; });
  }
  datos.columnas.forEach((c, i) => {
    const col = hoja.getColumn(i + 1);
    col.width = ANCHO[c.tipo];
    if (FORMATO_EXCEL[c.tipo]) col.numFmt = FORMATO_EXCEL[c.tipo]!;
  });
  if (datos.nota) {
    hoja.addRow([]);
    hoja.addRow([datos.nota]).font = { italic: true, color: { argb: "FF78716C" } };
  }
  hoja.views = [{ state: "frozen", ySplit: 5 }];

  const buffer = await libro.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}.xlsx"`,
    },
  });
}
