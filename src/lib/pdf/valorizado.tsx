import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { fecha, kg, soles } from "@/lib/formato";
import { BandaMarca, COBRE, COBRE_OSCURO, fechaHoraLima, PieMarca, TINTE, type EmpresaPdf } from "./marca";

// Inventario valorizado con la marca de la empresa (banda y pie en marca.tsx).

const s = StyleSheet.create({
  pagina: { paddingTop: 0, paddingBottom: 40, paddingHorizontal: 0, fontSize: 8, fontFamily: "Helvetica", color: "#1c1917" },
  cuerpo: { paddingHorizontal: 28, paddingTop: 14 },
  kpis: { flexDirection: "row", marginBottom: 14 },
  kpi: { flex: 1, borderWidth: 0.75, borderColor: "#e7e5e4", borderLeftWidth: 3, borderLeftColor: COBRE, borderRadius: 4, padding: 8, marginRight: 6 },
  kpiTitulo: { fontSize: 6.5, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.4 },
  kpiValor: { fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 3 },
  kpiDetalle: { fontSize: 6.5, color: "#78716c", marginTop: 2 },
  seccion: { fontFamily: "Helvetica-Bold", fontSize: 10, color: COBRE_OSCURO, marginBottom: 5, marginTop: 4 },
  nota: { fontSize: 7, color: "#78716c", marginTop: 5 },
  cab: { flexDirection: "row", backgroundColor: COBRE, paddingVertical: 5 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#ffffff", paddingHorizontal: 4 },
  fila: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4" },
  td: { paddingHorizontal: 4 },
  total: { flexDirection: "row", paddingVertical: 5, backgroundColor: TINTE, borderTopWidth: 1, borderTopColor: COBRE, fontFamily: "Helvetica-Bold" },
  punto: { width: 6, height: 6, borderRadius: 3, marginRight: 4, marginTop: 1 },
  etiqueta: { fontSize: 6.5, fontFamily: "Helvetica-Bold", paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3 },
});

export interface DatosValorizado {
  empresa: EmpresaPdf;
  /** Imagen PNG/JPG del logo (data URI o Buffer); sin logo se dibujan las iniciales */
  logo?: string | Buffer | null;
  generado: Date;
  usuario: string;
  totales: { kg: number; valor_costo: number; valor_venta: number; ganancia: number; en_transito: number; por_cobrar: number };
  metales: { nombre: string; color: string | null; kg: number; costo_promedio: number | null; valor_costo: number; precio_venta: number; valor_venta: number }[];
  lotes: { fecha: string; numero: number; proveedor: string | null; metal: string; color: string | null; kg_en_stock: number; dias: number; por_seleccionar: boolean; retrasado: boolean }[];
}

const precio = (v: number | null) => (v === null ? "-" : `S/ ${Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`);
const pct = (v: number) => `${v.toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
type Columna = { titulo: string; ancho: number; der?: boolean };
const COL_METAL: Columna[] = [
  { titulo: "Metal", ancho: 18 }, { titulo: "Stock", ancho: 12, der: true }, { titulo: "Costo prom./kg", ancho: 11, der: true },
  { titulo: "Valor a costo", ancho: 13, der: true }, { titulo: "Precio venta/kg", ancho: 11, der: true },
  { titulo: "Valor a venta", ancho: 13, der: true }, { titulo: "Ganancia potencial", ancho: 13, der: true }, { titulo: "% del valor", ancho: 9, der: true },
];
const COL_LOTE: Columna[] = [
  { titulo: "Llegó", ancho: 11 }, { titulo: "Compra", ancho: 9 }, { titulo: "Proveedor", ancho: 28 }, { titulo: "Metal", ancho: 16 },
  { titulo: "En stock (est.)", ancho: 13, der: true }, { titulo: "Días", ancho: 8, der: true }, { titulo: "Estado", ancho: 15 },
];

function Cabecera({ cols }: { cols: Columna[] }) {
  const suma = cols.reduce((a, c) => a + c.ancho, 0);
  return (
    <View style={s.cab}>
      {cols.map((c) => <Text key={c.titulo} style={[s.th, { width: `${(c.ancho / suma) * 100}%`, textAlign: c.der ? "right" : "left" }]}>{c.titulo}</Text>)}
    </View>
  );
}

function Celda({ cols, i, children, bold }: { cols: Columna[]; i: number; children: React.ReactNode; bold?: boolean }) {
  const suma = cols.reduce((a, c) => a + c.ancho, 0);
  return (
    <View style={[s.td, { width: `${(cols[i].ancho / suma) * 100}%`, flexDirection: "row", justifyContent: cols[i].der ? "flex-end" : "flex-start" }]}>
      {typeof children === "string" ? <Text style={bold ? { fontFamily: "Helvetica-Bold" } : undefined}>{children}</Text> : children}
    </View>
  );
}

export function ValorizadoPdf({ d }: { d: DatosValorizado }) {
  const t = d.totales;
  const kpis = [
    { titulo: "Kilos en stock", valor: kg(t.kg), detalle: `${d.metales.filter((m) => m.kg > 0).length} metales con stock` },
    { titulo: "Valor a costo", valor: soles(t.valor_costo), detalle: "Costo promedio ponderado" },
    { titulo: "Valor a precio de venta", valor: soles(t.valor_venta), detalle: "Con el precio de venta del día" },
    { titulo: "Ganancia potencial", valor: soles(t.ganancia), detalle: "Si se vende hoy todo el stock" },
    ...(t.en_transito > 0 ? [{ titulo: "En tránsito", valor: soles(t.en_transito), detalle: "Ventas por confirmar (a costo)" }] : []),
    ...(t.por_cobrar > 0 ? [{ titulo: "Por cobrar a proveedores", valor: soles(t.por_cobrar), detalle: "Descuentos de selección" }] : []),
  ];
  const sumaCostoCent = d.metales.reduce((a, m) => a + Math.round(m.valor_costo * 100), 0);

  return (
    <Document title={`Inventario valorizado - ${d.empresa.razon_social}`} author={d.empresa.razon_social} creator="Sistema Otiniano">
      <Page size="A4" orientation="landscape" style={s.pagina}>
        <BandaMarca empresa={d.empresa} logo={d.logo} titulo="Inventario valorizado"
          lineas={[`Al ${fechaHoraLima(d.generado)}  ·  Generado por ${d.usuario}`]} />

        <View style={s.cuerpo}>
          <View style={s.kpis}>
            {kpis.map((k, i) => (
              <View key={k.titulo} style={[s.kpi, i === kpis.length - 1 ? { marginRight: 0 } : {}]}>
                <Text style={s.kpiTitulo}>{k.titulo}</Text>
                <Text style={s.kpiValor}>{k.valor}</Text>
                <Text style={s.kpiDetalle}>{k.detalle}</Text>
              </View>
            ))}
          </View>

          <Text style={s.seccion}>Stock por metal</Text>
          <Cabecera cols={COL_METAL} />
          {d.metales.map((m, i) => (
            <View key={m.nombre} style={[s.fila, i % 2 === 1 ? { backgroundColor: "#fafaf9" } : {}]} wrap={false}>
              <Celda cols={COL_METAL} i={0}>
                <View style={[s.punto, { backgroundColor: m.color ?? "#a8a29e" }]} />
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{m.nombre}</Text>
              </Celda>
              <Celda cols={COL_METAL} i={1}>{kg(m.kg)}</Celda>
              <Celda cols={COL_METAL} i={2}>{precio(m.costo_promedio)}</Celda>
              <Celda cols={COL_METAL} i={3}>{soles(m.valor_costo)}</Celda>
              <Celda cols={COL_METAL} i={4}>{precio(m.precio_venta)}</Celda>
              <Celda cols={COL_METAL} i={5}>{soles(m.valor_venta)}</Celda>
              <Celda cols={COL_METAL} i={6}>{soles(Math.round(m.valor_venta * 100 - m.valor_costo * 100) / 100)}</Celda>
              <Celda cols={COL_METAL} i={7}>{sumaCostoCent > 0 ? pct((Math.round(m.valor_costo * 100) * 100) / sumaCostoCent) : "-"}</Celda>
            </View>
          ))}
          <View style={s.total} wrap={false}>
            <Celda cols={COL_METAL} i={0} bold>Total</Celda>
            <Celda cols={COL_METAL} i={1} bold>{kg(t.kg)}</Celda>
            <Celda cols={COL_METAL} i={2}>{""}</Celda>
            <Celda cols={COL_METAL} i={3} bold>{soles(t.valor_costo)}</Celda>
            <Celda cols={COL_METAL} i={4}>{""}</Celda>
            <Celda cols={COL_METAL} i={5} bold>{soles(t.valor_venta)}</Celda>
            <Celda cols={COL_METAL} i={6} bold>{soles(t.ganancia)}</Celda>
            <Celda cols={COL_METAL} i={7} bold>{sumaCostoCent > 0 ? pct(100) : "-"}</Celda>
          </View>
          <Text style={s.nota}>
            Valor a costo = kilos x costo promedio ponderado (lo que realmente costó). Valor a venta = kilos x precio de venta del día.
          </Text>

          {d.lotes.length > 0 && (
            <View break={d.metales.length > 8}>
              <Text style={[s.seccion, { marginTop: 14 }]}>Antigüedad del stock (lotes en almacén)</Text>
              <Cabecera cols={COL_LOTE} />
              {d.lotes.map((l, i) => (
                <View key={`${l.numero}-${l.metal}-${i}`} style={[s.fila, i % 2 === 1 ? { backgroundColor: "#fafaf9" } : {}]} wrap={false}>
                  <Celda cols={COL_LOTE} i={0}>{fecha(l.fecha)}</Celda>
                  <Celda cols={COL_LOTE} i={1}>{`N° ${l.numero}`}</Celda>
                  <Celda cols={COL_LOTE} i={2}>{l.proveedor ?? "Sin documento"}</Celda>
                  <Celda cols={COL_LOTE} i={3}>
                    <View style={[s.punto, { backgroundColor: l.color ?? "#a8a29e" }]} />
                    <Text>{l.metal}</Text>
                  </Celda>
                  <Celda cols={COL_LOTE} i={4}>{kg(l.kg_en_stock)}</Celda>
                  <Celda cols={COL_LOTE} i={5}>{String(l.dias)}</Celda>
                  <Celda cols={COL_LOTE} i={6}>
                    {l.retrasado
                      ? <Text style={[s.etiqueta, { backgroundColor: "#fee2e2", color: "#b91c1c" }]}>Retrasado</Text>
                      : l.por_seleccionar
                        ? <Text style={[s.etiqueta, { backgroundColor: "#fef3c7", color: "#92400e" }]}>Por seleccionar</Text>
                        : <Text style={[s.etiqueta, { backgroundColor: "#d1fae5", color: "#065f46" }]}>Seleccionado</Text>}
                  </Celda>
                </View>
              ))}
              <Text style={s.nota}>
                Kilos en stock estimados por lote: se asume que lo más antiguo sale primero. El valor oficial del stock usa el costo promedio.
              </Text>
            </View>
          )}
        </View>

        <PieMarca texto={`${d.empresa.razon_social}  ·  Documento de uso interno, confidencial`} />
      </Page>
    </Document>
  );
}
