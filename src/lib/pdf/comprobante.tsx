import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ETIQUETA_MEDIO, kg, soles } from "@/lib/formato";
import { BandaMarca, CEBRA, COBRE, COBRE_OSCURO, fechaHoraLima, PieMarca, TINTE, type EmpresaPdf } from "./marca";

// Comprobante interno A4 de una compra o una venta, con la marca de la empresa (como el valorizado).
// Las cifras vienen tal cual de la BD (v_compras / v_ventas y sus ítems); aquí solo se dan formato.

const s = StyleSheet.create({
  pagina: { paddingTop: 0, paddingBottom: 48, paddingHorizontal: 0, fontSize: 8.5, fontFamily: "Helvetica", color: "#1c1917" },
  cuerpo: { paddingHorizontal: 28, paddingTop: 16 },
  anulada: {
    alignSelf: "flex-start", fontFamily: "Helvetica-Bold", fontSize: 9, color: "#b91c1c", backgroundColor: "#fee2e2",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, marginBottom: 10,
  },
  cajas: { flexDirection: "row", marginBottom: 16 },
  caja: { flex: 1, borderWidth: 0.75, borderColor: "#e7e5e4", borderLeftWidth: 3, borderLeftColor: COBRE, borderRadius: 4, padding: 9 },
  cajaTitulo: { fontSize: 6.5, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  cajaValor: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  cajaDato: { fontSize: 7.5, color: "#57534e", marginTop: 2 },
  seccion: { fontFamily: "Helvetica-Bold", fontSize: 10, color: COBRE_OSCURO, marginBottom: 5 },
  cab: { flexDirection: "row", backgroundColor: COBRE, paddingVertical: 5 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#ffffff", paddingHorizontal: 5 },
  fila: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4" },
  td: { paddingHorizontal: 5 },
  punto: { width: 6, height: 6, borderRadius: 3, marginRight: 5, marginTop: 1.5 },
  resumen: { flexDirection: "row", marginTop: 12 },
  notas: { flex: 1, marginRight: 16 },
  notaTexto: { fontSize: 7.5, color: "#57534e", marginTop: 2, lineHeight: 1.4 },
  totales: { width: 210 },
  totalFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 8 },
  totalFinal: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingVertical: 7, paddingHorizontal: 8,
    backgroundColor: TINTE, borderTopWidth: 1.5, borderTopColor: COBRE, borderRadius: 2,
  },
  totalTexto: { fontFamily: "Helvetica-Bold", fontSize: 10, color: COBRE_OSCURO },
  totalValor: { fontFamily: "Helvetica-Bold", fontSize: 15, color: COBRE_OSCURO },
  firmas: { flexDirection: "row", marginTop: 56 },
  firma: { flex: 1, borderTopWidth: 0.75, borderTopColor: "#78716c", paddingTop: 4, marginHorizontal: 24, alignItems: "center" },
  firmaTexto: { fontSize: 7.5, color: "#57534e" },
});

export interface ColumnaComprobante { titulo: string; ancho: number; der?: boolean }

export interface DatosComprobante {
  empresa: EmpresaPdf;
  logo?: string | Buffer | null;
  /** "Ticket de compra", "Nota de salida", "Comprobante de venta" */
  titulo: string;
  numero: number;
  fecha: string;
  anulada: boolean;
  /** Recuadros de arriba (proveedor/comprador, pago, guía…) */
  datos: { titulo: string; valor: string; lineas?: (string | null | undefined)[] }[];
  columnas: ColumnaComprobante[];
  /** Primera celda = metal (con su color) */
  filas: { color: string | null; celdas: string[] }[];
  /** Filas de totales sobre el total final (kilos, a favor…) */
  subtotales: [string, string][];
  total: { texto: string; valor: string };
  notas: string[];
  firmas: [string, string];
  pie: string;
}

const PUNTO_SIN_COLOR = "#a8a29e";

export function ComprobantePdf({ d }: { d: DatosComprobante }) {
  const suma = d.columnas.reduce((a, c) => a + c.ancho, 0);
  const ancho = (i: number) => `${(d.columnas[i].ancho / suma) * 100}%`;
  const numero = `N° ${String(d.numero).padStart(6, "0")}`;

  return (
    <Document title={`${d.titulo} ${numero} - ${d.empresa.razon_social}`} author={d.empresa.razon_social} creator="Sistema Otiniano">
      <Page size="A4" style={s.pagina}>
        <BandaMarca empresa={d.empresa} logo={d.logo} titulo={d.titulo} lineas={[numero, fechaHoraLima(d.fecha)]} />

        <View style={s.cuerpo}>
          {d.anulada && <Text style={s.anulada}>ANULADA</Text>}

          <View style={s.cajas}>
            {d.datos.map((x, i) => (
              <View key={x.titulo} style={[s.caja, i < d.datos.length - 1 ? { marginRight: 8 } : {}]}>
                <Text style={s.cajaTitulo}>{x.titulo}</Text>
                <Text style={s.cajaValor}>{x.valor}</Text>
                {(x.lineas ?? []).filter(Boolean).map((l) => <Text key={l} style={s.cajaDato}>{l}</Text>)}
              </View>
            ))}
          </View>

          <Text style={s.seccion}>Detalle</Text>
          <View style={s.cab}>
            {d.columnas.map((c, i) => (
              <Text key={c.titulo} style={[s.th, { width: ancho(i), textAlign: c.der ? "right" : "left" }]}>{c.titulo}</Text>
            ))}
          </View>
          {d.filas.map((f, n) => (
            <View key={n} style={[s.fila, n % 2 === 1 ? { backgroundColor: CEBRA } : {}]} wrap={false}>
              {f.celdas.map((v, i) => i === 0 ? (
                <View key={i} style={[s.td, { width: ancho(0), flexDirection: "row" }]}>
                  <View style={[s.punto, { backgroundColor: f.color ?? PUNTO_SIN_COLOR }]} />
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{v}</Text>
                </View>
              ) : (
                <Text key={i} style={[s.td, { width: ancho(i), textAlign: d.columnas[i].der ? "right" : "left" },
                  i === f.celdas.length - 1 ? { fontFamily: "Helvetica-Bold" } : {}]}>{v}</Text>
              ))}
            </View>
          ))}

          <View style={s.resumen} wrap={false}>
            <View style={s.notas}>
              {d.notas.length > 0 && <Text style={[s.cajaTitulo, { marginBottom: 1 }]}>Observaciones</Text>}
              {d.notas.map((n) => <Text key={n} style={s.notaTexto}>{n}</Text>)}
            </View>
            <View style={s.totales}>
              {d.subtotales.map(([t, v]) => (
                <View key={t} style={s.totalFila}>
                  <Text style={{ color: "#57534e" }}>{t}</Text>
                  <Text>{v}</Text>
                </View>
              ))}
              <View style={s.totalFinal}>
                <Text style={s.totalTexto}>{d.total.texto}</Text>
                <Text style={s.totalValor}>{d.total.valor}</Text>
              </View>
            </View>
          </View>

          <View style={s.firmas} wrap={false}>
            {d.firmas.map((f) => <View key={f} style={s.firma}><Text style={s.firmaTexto}>{f}</Text></View>)}
          </View>
        </View>

        <PieMarca texto={d.pie} />
      </Page>
    </Document>
  );
}

// Armado de los datos de cada documento a partir de las filas de las vistas.

type EmpresaLogo = { empresa: EmpresaPdf; logo?: string | Buffer | null };
type Num = number | string | null | undefined;
const precioKg = (v: Num) => (v === null || v === undefined ? "-" : `${soles(v)}/kg`);
const medio = (m: string | null | undefined) => (m ? ETIQUETA_MEDIO[m] ?? m : "-");

export function datosCompra(base: EmpresaLogo, c: {
  numero: number; fecha: string; estado: string; total: Num; kg_total: Num; saldo_aplicado: Num; medio_pago: string | null;
  caja_nombre: string | null; proveedor_nombre: string | null; proveedor_tipo_doc: string | null; proveedor_nro_doc: string | null; notas: string | null;
}, items: { metal_nombre: string; metal_color: string | null; peso_bruto_kg: Num; descuento_kg: Num; peso_neto_kg: Num; precio_kg: Num; importe: Num }[]): DatosComprobante {
  const aFavor = Number(c.saldo_aplicado ?? 0);
  return {
    ...base,
    titulo: "Ticket de compra",
    numero: c.numero,
    fecha: c.fecha,
    anulada: c.estado === "anulada",
    datos: [
      {
        titulo: "Proveedor", valor: c.proveedor_nombre ?? "Sin documento",
        lineas: [c.proveedor_nro_doc ? `${c.proveedor_tipo_doc ?? "Doc."} ${c.proveedor_nro_doc}` : null],
      },
      { titulo: "Pago", valor: medio(c.medio_pago), lineas: [c.caja_nombre && `Sale de: ${c.caja_nombre}`] },
    ],
    columnas: [
      { titulo: "Metal", ancho: 24 }, { titulo: "Peso bruto", ancho: 14, der: true }, { titulo: "Descuento", ancho: 13, der: true },
      { titulo: "Peso neto", ancho: 14, der: true }, { titulo: "Precio", ancho: 15, der: true }, { titulo: "Importe", ancho: 16, der: true },
    ],
    filas: items.map((i) => ({
      color: i.metal_color,
      celdas: [i.metal_nombre, kg(i.peso_bruto_kg), kg(i.descuento_kg), kg(i.peso_neto_kg), precioKg(i.precio_kg), soles(i.importe)],
    })),
    subtotales: [
      ["Kilos netos", kg(c.kg_total)],
      ...(aFavor > 0 ? [["Total compra", soles(c.total)], ["Descontado a favor", `- ${soles(aFavor)}`]] as [string, string][] : []),
    ],
    total: aFavor > 0
      ? { texto: "PAGADO", valor: soles(Math.round(Number(c.total) * 100 - aFavor * 100) / 100) }
      : { texto: "TOTAL", valor: soles(c.total) },
    notas: [c.notas].filter((x): x is string => !!x),
    firmas: ["Entregué conforme (proveedor)", "Recibí conforme"],
    pie: `${base.empresa.razon_social}  ·  Documento interno, no es comprobante de pago`,
  };
}

export function datosVenta(base: EmpresaLogo, v: {
  numero: number; fecha: string; fecha_confirmacion: string | null; estado: string; total: Num; kg_salida: Num; kg_recibido: Num; merma_kg: Num;
  medio_pago: string | null; caja_nombre: string | null; comprador_nombre: string | null; comprador_ruc: string | null; guia_numero: string | null; notas: string | null;
}, items: { metal_nombre: string; metal_color: string | null; peso_salida_kg: Num; peso_recibido_kg: Num; merma_kg: Num; precio_kg: Num; importe: Num }[]): DatosComprobante {
  const pendiente = v.estado === "pendiente";
  const guion = (x: Num, f: (y: Num) => string) => (x === null || x === undefined ? "-" : f(x));
  return {
    ...base,
    titulo: pendiente ? "Nota de salida" : "Comprobante de venta",
    numero: v.numero,
    fecha: v.fecha,
    anulada: v.estado === "anulada",
    datos: [
      { titulo: "Comprador", valor: v.comprador_nombre ?? "-", lineas: [v.comprador_ruc && `RUC ${v.comprador_ruc}`] },
      { titulo: "Guía de traslado", valor: v.guia_numero ?? "Sin guía", lineas: [`Salida: ${fechaHoraLima(v.fecha)}`] },
      pendiente
        ? { titulo: "Estado", valor: "Pendiente de pesaje", lineas: ["Falta el peso y precio del comprador"] }
        : {
          titulo: "Cobro", valor: medio(v.medio_pago),
          lineas: [v.caja_nombre && `Entra a: ${v.caja_nombre}`, v.fecha_confirmacion && `Confirmada: ${fechaHoraLima(v.fecha_confirmacion)}`],
        },
    ],
    columnas: [
      { titulo: "Metal", ancho: 22 }, { titulo: "Salida", ancho: 14, der: true }, { titulo: "Recibido", ancho: 14, der: true },
      { titulo: "Merma", ancho: 12, der: true }, { titulo: "Precio", ancho: 15, der: true }, { titulo: "Importe", ancho: 16, der: true },
    ],
    filas: items.map((i) => ({
      color: i.metal_color,
      celdas: [i.metal_nombre, kg(i.peso_salida_kg), guion(i.peso_recibido_kg, kg), guion(i.merma_kg, kg), guion(i.precio_kg, precioKg), guion(i.importe, soles)],
    })),
    subtotales: [
      ["Kilos de salida", kg(v.kg_salida)],
      ...(pendiente ? [] : [["Kilos recibidos", kg(v.kg_recibido)], ["Merma", kg(v.merma_kg)]] as [string, string][]),
    ],
    total: pendiente ? { texto: "TOTAL", valor: "Por confirmar" } : { texto: "TOTAL", valor: soles(v.total) },
    notas: [v.notas].filter((x): x is string => !!x),
    firmas: ["Despachado por", "Recibido por (comprador)"],
    pie: `${base.empresa.razon_social}  ·  Pesos de salida según nuestra balanza  ·  Documento interno, no es comprobante de pago`,
  };
}
