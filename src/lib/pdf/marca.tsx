import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

// Marca común de los PDF con la identidad de la empresa (valorizado, comprobantes de compra y venta).
// Solo Helvetica: sin "−" ni flechas unicode.
export const COBRE = "#a85219";
export const COBRE_OSCURO = "#6e3514";
export const TINTE = "#fdf5ef";
export const CEBRA = "#fafaf9";

export interface EmpresaPdf { razon_social: string; ruc: string | null; direccion: string | null; telefono: string | null }

const s = StyleSheet.create({
  banda: { backgroundColor: COBRE, paddingVertical: 14, paddingHorizontal: 28, flexDirection: "row", alignItems: "center" },
  logoCaja: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  logo: { width: 38, height: 38, objectFit: "contain" },
  iniciales: { fontFamily: "Helvetica-Bold", fontSize: 16, color: COBRE },
  empresa: { fontFamily: "Helvetica-Bold", fontSize: 13, color: "#ffffff" },
  empresaDato: { fontSize: 8, color: "#fae6d6", marginTop: 2 },
  bandaDer: { marginLeft: "auto", alignItems: "flex-end" },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 16, color: "#ffffff" },
  subtitulo: { fontSize: 8, color: "#fae6d6", marginTop: 2 },
  franja: { height: 4, backgroundColor: COBRE_OSCURO },
  pie: {
    position: "absolute", bottom: 16, left: 28, right: 28, fontSize: 6.5, color: "#a8a29e",
    flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#e7e5e4", paddingTop: 5,
  },
});

export function iniciales(nombre: string) {
  const palabras = nombre.replace(/\b(S\.?A\.?C?\.?|E\.?I\.?R\.?L\.?|SRL|SAC)\b/gi, "").split(/\s+/).filter(Boolean);
  return (palabras.slice(0, 2).map((p) => p[0]).join("") || "M").toUpperCase();
}

export const datosEmpresa = (e: EmpresaPdf) =>
  [e.ruc && `RUC ${e.ruc}`, e.direccion, e.telefono && `Tel. ${e.telefono}`].filter(Boolean).join("  ·  ");

export const fechaHoraLima = (d: Date | string) =>
  new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Lima" })
    .format(typeof d === "string" ? new Date(d) : d);

/** Logo en su caja blanca; sin logo, las iniciales de la empresa */
export function Logo({ empresa, logo, tamano = 44 }: { empresa: EmpresaPdf; logo?: string | Buffer | null; tamano?: number }) {
  return (
    <View style={[s.logoCaja, { width: tamano, height: tamano }]}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no tiene alt */}
      {logo ? <Image src={logo} style={[s.logo, { width: tamano - 6, height: tamano - 6 }]} /> : <Text style={s.iniciales}>{iniciales(empresa.razon_social)}</Text>}
    </View>
  );
}

/** Banda de color de la cabecera: logo y datos de la empresa a la izquierda; título del documento a la derecha */
export function BandaMarca({ empresa, logo, titulo, lineas }: {
  empresa: EmpresaPdf; logo?: string | Buffer | null; titulo: string; lineas: string[];
}) {
  const datos = datosEmpresa(empresa);
  return (
    <>
      <View style={s.banda}>
        <Logo empresa={empresa} logo={logo} />
        <View style={{ maxWidth: "55%" }}>
          <Text style={s.empresa}>{empresa.razon_social}</Text>
          {datos && <Text style={s.empresaDato}>{datos}</Text>}
        </View>
        <View style={s.bandaDer}>
          <Text style={s.titulo}>{titulo}</Text>
          {lineas.map((l) => <Text key={l} style={s.subtitulo}>{l}</Text>)}
        </View>
      </View>
      <View style={s.franja} />
    </>
  );
}

/** Pie fijo en cada página: aviso a la izquierda, número de página a la derecha */
export function PieMarca({ texto }: { texto: string }) {
  return (
    <View style={s.pie} fixed>
      <Text>{texto}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}
