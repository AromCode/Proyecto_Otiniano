import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { fechaHora, kg, soles, ETIQUETA_MEDIO } from "@/lib/formato";

// Ticket de 80 mm (226.77 pt de ancho) para la impresora térmica: en blanco y negro, con el logo arriba.
// El alto crece con las líneas. El comprobante A4 con la marca a color está en comprobante.tsx.
const ANCHO = 226.77;

const s = StyleSheet.create({
  pagina: { padding: 12, fontSize: 8, fontFamily: "Helvetica", color: "#111" },
  centro: { textAlign: "center" },
  empresa: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "center" },
  titulo: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 6 },
  linea: { borderBottomWidth: 0.5, borderBottomColor: "#999", borderBottomStyle: "dashed", marginVertical: 5 },
  fila: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Helvetica-Bold" },
  total: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  peq: { fontSize: 7, color: "#444" },
  logo: { width: 40, height: 40, objectFit: "contain", alignSelf: "center", marginBottom: 4 },
  gruesa: { borderBottomWidth: 1.5, borderBottomColor: "#111", marginVertical: 5 },
});

export interface DatosTicket {
  titulo: string;
  empresa: { razon_social: string; ruc: string | null; direccion: string | null; telefono: string | null };
  /** Logo PNG/JPG (Buffer o data URI); opcional */
  logo?: string | Buffer | null;
  numero: number;
  fecha: string;
  contraparte: string;
  documento: string | null;
  medio_pago: string | null;
  estado: string;
  items: { metal: string; bruto?: string | null; descuento?: string | null; neto: string; precio: string | null; importe: string | null }[];
  total: string;
  /** Líneas bajo el total (p. ej. descuento a favor y lo pagado) */
  extras?: [string, string][];
  notas?: string | null;
  pie?: string;
}

export function TicketPdf({ d }: { d: DatosTicket }) {
  const alto = 270 + (d.logo ? 44 : 0) + (d.extras?.length ?? 0) * 12 + d.items.length * 44 + (d.notas ? 30 : 0);
  return (
    <Document title={`${d.titulo} N° ${d.numero}`}>
      <Page size={[ANCHO, alto]} style={s.pagina}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no tiene alt */}
        {d.logo && <Image src={d.logo} style={s.logo} />}
        <Text style={s.empresa}>{d.empresa.razon_social}</Text>
        {d.empresa.ruc && <Text style={s.centro}>RUC {d.empresa.ruc}</Text>}
        {d.empresa.direccion && <Text style={[s.centro, s.peq]}>{d.empresa.direccion}</Text>}
        {d.empresa.telefono && <Text style={[s.centro, s.peq]}>Tel. {d.empresa.telefono}</Text>}

        <View style={s.gruesa} />
        <Text style={s.titulo}>{d.titulo} N° {String(d.numero).padStart(6, "0")}</Text>
        {d.estado === "anulada" && <Text style={[s.centro, s.bold]}>*** ANULADA ***</Text>}
        <Text style={s.centro}>{fechaHora(d.fecha)}</Text>

        <View style={s.linea} />
        <Text><Text style={s.bold}>Nombre: </Text>{d.contraparte}</Text>
        {d.documento && <Text><Text style={s.bold}>Doc.: </Text>{d.documento}</Text>}
        <View style={s.linea} />

        {d.items.map((it, i) => (
          <View key={i} style={{ marginBottom: 4 }}>
            <Text style={s.bold}>{it.metal}</Text>
            {it.bruto && (
              <View style={s.fila}>
                <Text>Bruto {kg(it.bruto)}</Text>
                <Text>Desc. {kg(it.descuento)}</Text>
              </View>
            )}
            <View style={s.fila}>
              <Text>{kg(it.neto)} x {it.precio ? soles(it.precio) : "—"}</Text>
              <Text style={s.bold}>{it.importe ? soles(it.importe) : "—"}</Text>
            </View>
          </View>
        ))}

        <View style={s.linea} />
        <View style={s.fila}>
          <Text style={s.total}>TOTAL</Text>
          <Text style={s.total}>{soles(d.total)}</Text>
        </View>
        {(d.extras ?? []).map(([a, b]) => (
          <View key={a} style={s.fila}><Text>{a}</Text><Text style={s.bold}>{b}</Text></View>
        ))}
        {d.medio_pago && <Text>Pago: {ETIQUETA_MEDIO[d.medio_pago] ?? d.medio_pago}</Text>}
        {d.notas && <Text style={[s.peq, { marginTop: 4 }]}>Nota: {d.notas}</Text>}
        <View style={s.linea} />
        <Text style={[s.centro, s.peq]}>{d.pie ?? "Gracias por su preferencia"}</Text>
        <Text style={[s.centro, s.peq]}>Documento interno · no es comprobante de pago</Text>
      </Page>
    </Document>
  );
}
