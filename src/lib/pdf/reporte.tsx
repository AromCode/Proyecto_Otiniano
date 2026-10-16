import { Document, Page, StyleSheet, Text, View, type Styles } from "@react-pdf/renderer";

const s = StyleSheet.create({
  pagina: { padding: 28, fontSize: 8, fontFamily: "Helvetica", color: "#1c1917" },
  empresa: { fontSize: 9, color: "#57534e" },
  titulo: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },
  sub: { fontSize: 8, color: "#57534e", marginTop: 2, marginBottom: 10 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4", paddingVertical: 3 },
  cab: { flexDirection: "row", backgroundColor: "#f5f5f4", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#a8a29e" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#44403c", paddingHorizontal: 3 },
  td: { paddingHorizontal: 3 },
  total: { flexDirection: "row", paddingVertical: 4, borderTopWidth: 1, borderTopColor: "#78716c", fontFamily: "Helvetica-Bold" },
  nota: { fontSize: 7, color: "#78716c", marginTop: 8 },
  pie: { position: "absolute", bottom: 16, left: 28, right: 28, fontSize: 7, color: "#a8a29e", flexDirection: "row", justifyContent: "space-between" },
});

export interface TablaPdfProps {
  empresa: string;
  titulo: string;
  subtitulo: string;
  columnas: { titulo: string; derecha: boolean; ancho: number }[];
  filas: { celdas: string[]; fuerte?: boolean }[];
  total?: string[] | null;
  nota?: string;
}

export function ReportePdf(p: TablaPdfProps) {
  const horizontal = p.columnas.length > 6;
  const suma = p.columnas.reduce((a, c) => a + c.ancho, 0);
  const ancho = (i: number) => `${(p.columnas[i].ancho / suma) * 100}%`;
  const celdas = (valores: string[], estilo: Styles[string]) =>
    valores.map((v, i) => (
      <Text key={i} style={[estilo, { width: ancho(i), textAlign: p.columnas[i].derecha ? "right" : "left" }]}>{v}</Text>
    ));

  return (
    <Document title={p.titulo}>
      <Page size="A4" orientation={horizontal ? "landscape" : "portrait"} style={s.pagina}>
        <Text style={s.empresa}>{p.empresa}</Text>
        <Text style={s.titulo}>{p.titulo}</Text>
        <Text style={s.sub}>{p.subtitulo}</Text>
        <View style={s.cab} fixed>{celdas(p.columnas.map((c) => c.titulo), s.th)}</View>
        {p.filas.map((f, i) => (
          <View key={i} style={[s.fila, f.fuerte ? { fontFamily: "Helvetica-Bold", backgroundColor: "#fafaf9" } : {}]} wrap={false}>
            {celdas(f.celdas, s.td)}
          </View>
        ))}
        {p.total && <View style={s.total}>{celdas(p.total, s.td)}</View>}
        {p.nota && <Text style={s.nota}>{p.nota}</Text>}
        <View style={s.pie} fixed>
          <Text>Generado {new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
