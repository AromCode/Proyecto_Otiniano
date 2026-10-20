import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Bloque, Capitulo } from "./contenido";

// Colores de cada módulo (los mismos del menú del sistema) para ubicarse rápido en la guía
export const COLOR: Record<string, string> = {
  marca: "#a85219", teal: "#0f766e", indigo: "#4338ca", fuchsia: "#a21caf",
  violet: "#6d28d9", sky: "#0369a1", stone: "#44403c",
};

const TINTA = "#1c1917";
const SUAVE = "#57534e";
const LINEA = "#e7e5e4";

const s = StyleSheet.create({
  pagina: { paddingTop: 48, paddingBottom: 54, paddingHorizontal: 50, fontSize: 10, fontFamily: "Helvetica", color: TINTA, lineHeight: 1.45 },
  cabecera: { position: "absolute", top: 20, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#a8a29e" },
  pie: { position: "absolute", bottom: 22, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#a8a29e", borderTopWidth: 0.5, borderTopColor: LINEA, paddingTop: 6 },

  // Portada
  portada: { padding: 0, fontFamily: "Helvetica", color: TINTA },
  franja: { backgroundColor: "#a85219", height: 250, paddingHorizontal: 56, paddingTop: 90, color: "#ffffff" },
  portadaEtiqueta: { fontSize: 10, letterSpacing: 2, color: "#fae6d6", marginBottom: 14 },
  portadaTitulo: { fontSize: 34, fontFamily: "Helvetica-Bold", lineHeight: 1.1 },
  portadaSub: { fontSize: 13, marginTop: 12, color: "#fdf5ef" },
  portadaCuerpo: { paddingHorizontal: 56, paddingTop: 40 },

  // Índice
  indiceFila: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: LINEA },
  indicePunto: { width: 8, height: 8, borderRadius: 2, marginRight: 10 },
  indiceTexto: { fontSize: 11, fontFamily: "Helvetica-Bold", color: TINTA },
  indiceSub: { fontSize: 8.5, color: SUAVE },

  // Capítulo y secciones
  capEtiqueta: { fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginBottom: 4 },
  capTitulo: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 6, lineHeight: 1.15 },
  capIntro: { fontSize: 11, color: SUAVE, marginBottom: 14 },
  barra: { height: 3, width: 46, borderRadius: 2, marginBottom: 16 },
  secTitulo: { fontSize: 13.5, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4 },
  ficha: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  dato: { fontSize: 8.5, color: SUAVE, backgroundColor: "#f5f5f4", borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6, marginRight: 6, marginBottom: 4 },
  datoFuerte: { fontFamily: "Helvetica-Bold", color: TINTA },
  sub: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 3 },
  p: { marginBottom: 6 },
  item: { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
  vineta: { width: 14, color: SUAVE },
  num: { width: 18, fontFamily: "Helvetica-Bold" },
  itemTexto: { flex: 1 },
  caja: { borderLeftWidth: 3, borderRadius: 3, paddingVertical: 8, paddingHorizontal: 10, marginVertical: 8 },
  cajaTitulo: { fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 3 },
  tabla: { marginVertical: 6, borderWidth: 0.5, borderColor: LINEA, borderRadius: 3 },
  tablaCab: { flexDirection: "row", backgroundColor: "#f5f5f4", borderBottomWidth: 0.5, borderBottomColor: "#d6d3d1" },
  tablaFila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINEA },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", padding: 5, color: "#44403c" },
  td: { fontSize: 9, padding: 5 },
});

/** Texto con **negritas** (marcadas con dobles asteriscos) */
function Rico({ t }: { t: string }) {
  const partes = t.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {partes.map((x, i) =>
        x.startsWith("**") ? <Text key={i} style={{ fontFamily: "Helvetica-Bold" }}>{x.slice(2, -2)}</Text> : <Text key={i}>{x}</Text>,
      )}
    </>
  );
}

function BloqueVista({ b, color }: { b: Bloque; color: string }) {
  switch (b.t) {
    case "p":
      return <Text style={s.p}><Rico t={b.texto} /></Text>;
    case "sub":
      return <Text style={s.sub}>{b.texto}</Text>;
    case "lista":
      return (
        <View style={{ marginBottom: 6 }}>
          {b.items.map((x, i) => (
            <View key={i} style={s.item} wrap={false}>
              <Text style={s.vineta}>•</Text>
              <Text style={s.itemTexto}><Rico t={x} /></Text>
            </View>
          ))}
        </View>
      );
    case "pasos":
      return (
        <View style={{ marginBottom: 6 }}>
          {b.items.map((x, i) => (
            <View key={i} style={s.item} wrap={false}>
              <Text style={[s.num, { color }]}>{i + 1}.</Text>
              <Text style={s.itemTexto}><Rico t={x} /></Text>
            </View>
          ))}
        </View>
      );
    case "tabla": {
      const suma = b.anchos.reduce((a, x) => a + x, 0);
      const w = (i: number) => `${(b.anchos[i] / suma) * 100}%`;
      return (
        <View style={s.tabla}>
          <View style={s.tablaCab} fixed={false}>
            {b.columnas.map((c, i) => <Text key={i} style={[s.th, { width: w(i) }]}>{c}</Text>)}
          </View>
          {b.filas.map((f, j) => (
            <View key={j} style={[s.tablaFila, j === b.filas.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
              {f.map((c, i) => <Text key={i} style={[s.td, { width: w(i) }, i === 0 ? { fontFamily: "Helvetica-Bold" } : {}]}><Rico t={c} /></Text>)}
            </View>
          ))}
        </View>
      );
    }
    case "decir":
      return (
        <View style={[s.caja, { borderLeftColor: color, backgroundColor: "#fdf5ef" }]} wrap={false}>
          <Text style={[s.cajaTitulo, { color }]}>CÓMO EXPLICARLO AL CLIENTE</Text>
          <Text style={{ fontFamily: "Helvetica-Oblique" }}><Rico t={b.texto} /></Text>
        </View>
      );
    case "ojo":
      return (
        <View style={[s.caja, { borderLeftColor: "#b45309", backgroundColor: "#fffbeb" }]} wrap={false}>
          <Text style={[s.cajaTitulo, { color: "#b45309" }]}>{b.titulo ?? "IMPORTANTE"}</Text>
          <Text><Rico t={b.texto} /></Text>
        </View>
      );
  }
}

/** Bloque corto: se puede mover entero a la página siguiente junto con su título sin dejar un hueco grande */
const corto = (b?: Bloque) => !!b && (b.t === "p" || b.t === "decir" || b.t === "ojo" ||
  ((b.t === "lista" || b.t === "pasos") && b.items.length <= 3) || (b.t === "tabla" && b.filas.length <= 4));

/** Un subtítulo nunca queda solo al pie de página: viaja junto con el bloque que lo sigue */
function Bloques({ bloques, color }: { bloques: Bloque[]; color: string }) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i];
    if (b.t === "sub" && corto(bloques[i + 1])) {
      out.push(
        <View key={i} wrap={false}>
          <BloqueVista b={b} color={color} />
          <BloqueVista b={bloques[i + 1]} color={color} />
        </View>,
      );
      i++;
    } else if (b.t === "sub") {
      out.push(<View key={i} minPresenceAhead={60}><BloqueVista b={b} color={color} /></View>);
    } else out.push(<BloqueVista key={i} b={b} color={color} />);
  }
  return <>{out}</>;
}

export function Guia({ capitulos, fecha }: { capitulos: Capitulo[]; fecha: string }) {
  const marco = (
    <>
      <View style={s.cabecera} fixed>
        <Text>Sistema Metales · Guía del sistema</Text>
        <Text>{fecha}</Text>
      </View>
      <View style={s.pie} fixed>
        <Text>Documento de apoyo para la presentación al cliente</Text>
        <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
    </>
  );

  return (
    <Document title="Sistema Metales - Guía del sistema" author="Sistema Metales" language="es-PE">
      <Page size="A4" style={s.portada}>
        <View style={s.franja}>
          <Text style={s.portadaEtiqueta}>GUÍA DEL SISTEMA</Text>
          <Text style={s.portadaTitulo}>Sistema Metales</Text>
          <Text style={s.portadaSub}>Compra y venta de chatarra: caja, inventario y ganancias al día</Text>
        </View>
        <View style={s.portadaCuerpo}>
          <Text style={{ fontSize: 12, marginBottom: 10, fontFamily: "Helvetica-Bold" }}>Para qué es este documento</Text>
          <Text style={{ fontSize: 10.5, color: SUAVE, marginBottom: 8, lineHeight: 1.5 }}>
            Recorre el sistema sección por sección, en el mismo orden del menú: dónde está cada cosa, para qué sirve,
            qué datos pide, qué calcula solo y qué reglas cuida. Cada sección trae un recuadro «Cómo explicarlo al
            cliente» con una forma sencilla de contarlo en la reunión.
          </Text>
          <Text style={{ fontSize: 10.5, color: SUAVE, lineHeight: 1.5 }}>
            Sugerencia: abra el sistema en paralelo (celular o computadora) con la empresa de prueba «Metales Demo»
            y vaya mostrando cada pantalla mientras lee.
          </Text>
          <Text style={{ fontSize: 9, color: "#a8a29e", marginTop: 40 }}>Versión del {fecha}</Text>
        </View>
      </Page>

      <Page size="A4" style={s.pagina}>
        {marco}
        <Text style={[s.capTitulo, { marginBottom: 14 }]}>Contenido</Text>
        {capitulos.map((c, i) => (
          <View key={c.id} style={s.indiceFila} wrap={false}>
            <View style={[s.indicePunto, { backgroundColor: COLOR[c.color] }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.indiceTexto}>{i + 1}. {c.titulo}</Text>
              {c.resumen && <Text style={s.indiceSub}>{c.resumen}</Text>}
            </View>
          </View>
        ))}
      </Page>

      {capitulos.map((c, i) => (
        <Page key={c.id} size="A4" style={s.pagina}>
          {marco}
          <View>
            <Text style={[s.capEtiqueta, { color: COLOR[c.color] }]}>{`CAPÍTULO ${i + 1}`}{c.etiqueta ? ` · ${c.etiqueta.toUpperCase()}` : ""}</Text>
            <Text style={s.capTitulo}>{c.titulo}</Text>
            <View style={[s.barra, { backgroundColor: COLOR[c.color] }]} />
            {c.intro && <Text style={s.capIntro}><Rico t={c.intro} /></Text>}
          </View>
          {c.bloques && <Bloques bloques={c.bloques} color={COLOR[c.color]} />}
          {c.secciones?.map((sec, j) => (
            <View key={j}>
              {/* El título de la sección no queda solo: va con su ficha y su primer bloque */}
              <View wrap={false} minPresenceAhead={90}>
                <Text style={[s.secTitulo, { color: TINTA }]}>{sec.titulo}</Text>
                {(sec.donde || sec.quien) && (
                  <View style={s.ficha}>
                    {sec.donde && <Text style={s.dato}>Dónde: <Text style={s.datoFuerte}>{sec.donde}</Text></Text>}
                    {sec.quien && <Text style={s.dato}>Quién la usa: <Text style={s.datoFuerte}>{sec.quien}</Text></Text>}
                  </View>
                )}
                {corto(sec.bloques[0]) && <BloqueVista b={sec.bloques[0]} color={COLOR[c.color]} />}
              </View>
              <Bloques bloques={corto(sec.bloques[0]) ? sec.bloques.slice(1) : sec.bloques} color={COLOR[c.color]} />
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
