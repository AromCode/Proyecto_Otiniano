import ExcelJS from "exceljs";
import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { cargarLogo } from "@/lib/archivos-servidor";
import { hoyLima } from "@/lib/formato";
import { ValorizadoPdf, type DatosValorizado } from "@/lib/pdf/valorizado";

export const runtime = "nodejs";

// Inventario valorizado («valorizado total») en PDF o Excel con la marca de la empresa.
// Todas las cifras vienen de la BD (v_stock_metal, resumen_inventario, v_patrimonio, v_lotes).

const MARCA = "FF1A5CA8";
const MARCA_OSCURO = "FF0F2C50";
const TINTE = "FFEFF7FE";
const CEBRA = "FFFAFAF9";
const SOLES = '"S/" #,##0.00;[Red]-"S/" #,##0.00';
const PRECIO = '"S/" #,##0.00##';
const KG = '#,##0.000" kg"';

const n = (v: unknown) => Number(v ?? 0);

export async function GET(request: Request) {
  const ctx = await obtenerContexto();
  if (!puede(ctx.rol, "verCostos")) return new Response("Sin permiso", { status: 403 });
  const { supabase, empresa } = ctx;
  const formato = new URL(request.url).searchParams.get("formato") === "xlsx" ? "xlsx" : "pdf";

  const [stock, resumen, patrimonio, lotes, logo] = await Promise.all([
    supabase.from("v_stock_metal").select("*").eq("empresa_id", empresa.id).order("clave_orden"),
    supabase.rpc("resumen_inventario", { p_empresa: empresa.id }),
    supabase.from("v_patrimonio").select("en_transito, por_cobrar").eq("empresa_id", empresa.id).maybeSingle(),
    supabase.from("v_lotes").select("fecha, numero, proveedor_nombre, metal_nombre, metal_color, kg_en_stock, dias, por_seleccionar, retrasado")
      .eq("empresa_id", empresa.id).gt("kg_en_stock", 0).order("fecha").order("numero"),
    cargarLogo(supabase, empresa.logo_url),
  ]);
  for (const r of [stock, resumen, patrimonio, lotes]) if (r.error) return new Response(r.error.message, { status: 500 });

  const r = (resumen.data ?? {}) as Record<string, unknown>;
  const d: DatosValorizado = {
    empresa: { razon_social: empresa.razon_social, ruc: empresa.ruc, direccion: empresa.direccion, telefono: empresa.telefono },
    logo: logo?.buffer ?? null,
    generado: new Date(),
    usuario: ctx.nombre,
    totales: {
      kg: n(r.kg), valor_costo: n(r.valor_costo), valor_venta: n(r.valor_venta), ganancia: n(r.ganancia_potencial),
      en_transito: n(patrimonio.data?.en_transito), por_cobrar: n(patrimonio.data?.por_cobrar),
    },
    metales: (stock.data ?? []).filter((m) => m.activo || n(m.kg) !== 0).map((m) => ({
      nombre: m.ruta ?? m.nombre ?? "", color: m.color, kg: n(m.kg), costo_promedio: m.costo_promedio === null ? null : n(m.costo_promedio),
      valor_costo: n(m.valor_costo), precio_venta: n(m.precio_venta), valor_venta: n(m.valor_venta),
    })),
    lotes: (lotes.data ?? []).map((l) => ({
      fecha: l.fecha ?? "", numero: n(l.numero), proveedor: l.proveedor_nombre, metal: l.metal_nombre ?? "", color: l.metal_color,
      kg_en_stock: n(l.kg_en_stock), dias: n(l.dias), por_seleccionar: !!l.por_seleccionar, retrasado: !!l.retrasado,
    })),
  };
  const archivo = `valorizado_${hoyLima()}`;

  if (formato === "pdf") {
    const pdf = await renderToBuffer(<ValorizadoPdf d={d} />);
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${archivo}.pdf"` },
    });
  }

  const libro = await excelValorizado(d, logo);
  const buffer = await libro.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${archivo}.xlsx"`,
    },
  });
}

const fechaHoraLima = (d: Date) =>
  new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" }).format(d);

/** Excel no maneja zonas horarias: se escribe la fecha de Lima como fecha «local» */
const fechaExcel = (v: string) => new Date(new Date(v).getTime() - 5 * 3600 * 1000);

function bandaTitulo(hoja: ExcelJS.Worksheet, columnas: number, titulo: string, d: DatosValorizado, conLogo: boolean) {
  const ultima = hoja.getColumn(columnas).letter;
  const datos = [d.empresa.ruc && `RUC ${d.empresa.ruc}`, d.empresa.direccion, d.empresa.telefono && `Tel. ${d.empresa.telefono}`]
    .filter(Boolean).join("   ·   ");
  const filas: [string, Partial<ExcelJS.Font>][] = [
    [d.empresa.razon_social, { bold: true, size: 15, color: { argb: "FFFFFFFF" } }],
    [titulo, { bold: true, size: 12, color: { argb: "FFFAE6D6" } }],
    [`${datos ? datos + "   ·   " : ""}Al ${fechaHoraLima(d.generado)} · Generado por ${d.usuario}`, { size: 9, color: { argb: "FFFAE6D6" } }],
  ];
  filas.forEach(([texto, fuente], i) => {
    const f = i + 1;
    hoja.mergeCells(`${conLogo ? "B" : "A"}${f}:${ultima}${f}`);
    const celda = hoja.getCell(`${conLogo ? "B" : "A"}${f}`);
    celda.value = texto;
    celda.font = fuente;
    celda.alignment = { vertical: "middle", indent: 1 };
    hoja.getRow(f).height = i === 0 ? 26 : 18;
    for (let c = 1; c <= columnas; c++) hoja.getCell(f, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: MARCA } };
  });
  for (let c = 1; c <= columnas; c++) hoja.getCell(4, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: MARCA_OSCURO } };
  hoja.getRow(4).height = 4;
}

function cabecera(fila: ExcelJS.Row) {
  fila.height = 22;
  fila.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MARCA } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = { bottom: { style: "medium", color: { argb: MARCA_OSCURO } } };
  });
}

function cebra(fila: ExcelJS.Row, i: number, columnas: number) {
  for (let c = 1; c <= columnas; c++) {
    const celda = fila.getCell(c);
    if (i % 2 === 1) celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CEBRA } };
    celda.border = { bottom: { style: "hair", color: { argb: "FFE7E5E4" } } };
  }
}

function imprimir(hoja: ExcelJS.Worksheet, titulo: string, empresa: string) {
  hoja.pageSetup = { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  hoja.headerFooter = {
    oddHeader: `&L&8${empresa}&R&8${titulo}`,
    oddFooter: "&L&8Documento de uso interno&RPágina &P de &N",
  };
}

async function excelValorizado(d: DatosValorizado, logo: { buffer: Buffer; ext: "png" | "jpeg" } | null) {
  const libro = new ExcelJS.Workbook();
  libro.creator = d.empresa.razon_social;
  libro.created = d.generado;
  const idLogo = logo ? libro.addImage({ buffer: logo.buffer as unknown as ExcelJS.Buffer, extension: logo.ext }) : null;

  // --- Hoja 1: valorizado por metal ---
  const h = libro.addWorksheet("Valorizado", { views: [{ state: "frozen", ySplit: 11, showGridLines: false }] });
  const COLS = 8;
  bandaTitulo(h, COLS, "Inventario valorizado", d, !!idLogo);
  if (idLogo !== null) h.addImage(idLogo, { tl: { col: 0.15, row: 0.15 }, ext: { width: 54, height: 54 } });

  // Bloque de indicadores (fila 6 títulos, fila 7 valores)
  const t = d.totales;
  const kpis: [string, number, string][] = [
    ["Kilos en stock", t.kg, KG], ["Valor a costo", t.valor_costo, SOLES],
    ["Valor a precio de venta", t.valor_venta, SOLES], ["Ganancia potencial", t.ganancia, SOLES],
  ];
  if (t.en_transito > 0) kpis.push(["En tránsito", t.en_transito, SOLES]);
  if (t.por_cobrar > 0) kpis.push(["Por cobrar a proveedores", t.por_cobrar, SOLES]);
  kpis.slice(0, COLS).forEach(([titulo, valor, fmt], i) => {
    const tc = h.getCell(6, i + 1);
    tc.value = titulo.toUpperCase();
    tc.font = { size: 8, bold: true, color: { argb: "FF78716C" } };
    tc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TINTE } };
    tc.border = { left: { style: "thick", color: { argb: MARCA } } };
    const vc = h.getCell(7, i + 1);
    vc.value = valor;
    vc.numFmt = fmt;
    vc.font = { size: 13, bold: true };
    vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TINTE } };
    vc.border = { left: { style: "thick", color: { argb: MARCA } } };
  });
  h.getRow(7).height = 22;

  const t9 = h.getCell("A9");
  t9.value = "Stock por producto";
  t9.font = { bold: true, size: 11, color: { argb: MARCA_OSCURO } };

  const INI = 11;
  h.getRow(INI).values = ["Producto", "Stock (kg)", "Costo prom./kg", "Valor a costo", "Precio venta/kg", "Valor a venta", "Ganancia potencial", "% del valor"];
  cabecera(h.getRow(INI));
  d.metales.forEach((m, i) => {
    const f = INI + 1 + i;
    const fila = h.getRow(f);
    fila.values = [m.nombre, m.kg, m.costo_promedio, m.valor_costo, m.precio_venta, m.valor_venta,
      { formula: `F${f}-D${f}` }, null];
    cebra(fila, i, COLS);
  });
  const fin = INI + d.metales.length;
  const ft = fin + 1;
  if (d.metales.length) {
    for (let f = INI + 1; f <= fin; f++) h.getCell(f, 8).value = { formula: `IF($D$${ft}=0,0,D${f}/$D$${ft})` };
  }
  const total = h.getRow(ft);
  const suma = (col: string) => (d.metales.length ? { formula: `SUM(${col}${INI + 1}:${col}${fin})` } : 0);
  total.values = ["Total", suma("B"), null, suma("D"), null, suma("F"), suma("G"), d.metales.length ? 1 : null];
  total.height = 20;
  total.eachCell({ includeEmpty: true }, (c, col) => {
    if (col > COLS) return;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TINTE } };
    c.border = { top: { style: "medium", color: { argb: MARCA } } };
  });
  [["B", KG], ["C", PRECIO], ["D", SOLES], ["E", PRECIO], ["F", SOLES], ["G", SOLES], ["H", "0.0%"]].forEach(([col, fmt]) => {
    for (let f = INI + 1; f <= ft; f++) h.getCell(`${col}${f}`).numFmt = fmt;
  });
  h.autoFilter = { from: { row: INI, column: 1 }, to: { row: fin, column: COLS } };
  const nota = h.getCell(`A${ft + 2}`);
  nota.value = "Valor a costo = kilos × costo promedio ponderado. Valor a venta = kilos × precio de venta del día.";
  nota.font = { italic: true, size: 9, color: { argb: "FF78716C" } };
  [22, 15, 15, 16, 15, 16, 18, 12].forEach((w, i) => { h.getColumn(i + 1).width = w; });
  imprimir(h, "Inventario valorizado", d.empresa.razon_social);

  // --- Hoja 2: lotes en almacén ---
  const l = libro.addWorksheet("Lotes", { views: [{ state: "frozen", ySplit: 6, showGridLines: false }] });
  const LC = 7;
  bandaTitulo(l, LC, "Antigüedad del stock (lotes en almacén)", d, false);
  l.getRow(6).values = ["Llegó", "Compra N°", "Proveedor", "Producto", "En stock (kg, est.)", "Días en almacén", "Estado"];
  cabecera(l.getRow(6));
  d.lotes.forEach((x, i) => {
    const fila = l.getRow(7 + i);
    fila.values = [fechaExcel(x.fecha), x.numero, x.proveedor ?? "Sin documento", x.metal, x.kg_en_stock, x.dias,
      x.retrasado ? "Retrasado" : x.por_seleccionar ? "Por limpiar" : "Limpio"];
    cebra(fila, i, LC);
    const estado = fila.getCell(7);
    if (x.retrasado) estado.font = { bold: true, color: { argb: "FFB91C1C" } };
    else if (x.por_seleccionar) estado.font = { bold: true, color: { argb: "FF92400E" } };
  });
  const lf = 6 + d.lotes.length;
  const lt = l.getRow(lf + 1);
  lt.values = ["Total", null, null, null, d.lotes.length ? { formula: `SUM(E7:E${lf})` } : 0, null, null];
  lt.eachCell({ includeEmpty: true }, (c, col) => {
    if (col > LC) return;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TINTE } };
    c.border = { top: { style: "medium", color: { argb: MARCA } } };
  });
  for (let f = 7; f <= lf + 1; f++) {
    l.getCell(`A${f}`).numFmt = "dd/mm/yyyy";
    l.getCell(`E${f}`).numFmt = KG;
  }
  if (d.lotes.length) l.autoFilter = { from: { row: 6, column: 1 }, to: { row: lf, column: LC } };
  const ln = l.getCell(`A${lf + 3}`);
  ln.value = "Kilos en stock estimados por lote: se asume que lo más antiguo sale primero. El valor oficial usa el costo promedio.";
  ln.font = { italic: true, size: 9, color: { argb: "FF78716C" } };
  [13, 11, 34, 18, 18, 15, 17].forEach((w, i) => { l.getColumn(i + 1).width = w; });
  imprimir(l, "Lotes en almacén", d.empresa.razon_social);

  return libro;
}
