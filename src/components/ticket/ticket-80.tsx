import { ETIQUETA_MEDIO, fechaHora, kg, soles } from "@/lib/formato";
import type { DatosTicket } from "@/lib/pdf/ticket";
import { AutoImprimir } from "./auto-imprimir";

// Ticket de 80 mm en HTML para imprimir directo en la térmica. A diferencia del PDF, el navegador no lo
// centra en el rollo: AutoImprimir mide el contenido y fija @page al alto justo, así solo sale lo impreso.
// Todo en negro puro (la térmica no imprime grises) y en px/mm, sin depender del tema ni del tamaño de letra.
const CSS = `
html,body{margin:0!important;padding:0!important;background:#fff!important;color:#000!important}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
#ticket{box-sizing:border-box;width:80mm;padding:3mm 4mm 4mm;font:12px/1.35 Arial,Helvetica,sans-serif;color:#000}
#ticket *{color:#000}
#ticket .c{text-align:center}
#ticket .b{font-weight:700}
#ticket .emp{font-size:14px;font-weight:700;text-align:center}
#ticket .tit{font-size:15px;font-weight:700;text-align:center;margin-top:4px}
#ticket .peq{font-size:11px}
#ticket .fila{display:flex;justify-content:space-between;gap:6px}
#ticket .fila>:last-child{text-align:right;white-space:nowrap}
#ticket .lin{border-top:1px dashed #000;margin:6px 0}
#ticket .gruesa{border-top:2px solid #000;margin:6px 0}
#ticket .total{font-size:16px;font-weight:700}
#ticket .item{margin-bottom:5px}
#ticket .sec{font-size:11px;font-weight:700;text-transform:uppercase;margin:5px 0 2px}
#ticket .firmas{display:flex;gap:6mm;margin-top:14mm}
#ticket .firmas>div{flex:1;border-top:1px solid #000;padding-top:2px;text-align:center;font-size:11px}
#ticket img{display:block;margin:0 auto 4px;max-width:34mm;max-height:20mm;filter:grayscale(1) contrast(1.4)}
@media screen{body{background:#e7e5e4!important}#ticket{background:#fff;margin:16px auto;box-shadow:0 1px 4px rgba(0,0,0,.2)}}
`;

type EmpresaTicket = DatosTicket["empresa"];

/** Hoja de 80 mm: estilos, cabecera con la empresa y la impresión automática al cargar */
export function HojaTicket80({ empresa, logo, children }: { empresa: EmpresaTicket; logo?: DatosTicket["logo"]; children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div id="ticket">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URI del logo, va directo a la impresora */}
        {typeof logo === "string" && <img src={logo} alt="" />}
        <div className="emp">{empresa.razon_social}</div>
        {empresa.ruc && <div className="c">RUC {empresa.ruc}</div>}
        {empresa.direccion && <div className="c peq">{empresa.direccion}</div>}
        {empresa.telefono && <div className="c peq">Tel. {empresa.telefono}</div>}
        <div className="gruesa" />
        {children}
      </div>
      <AutoImprimir />
    </>
  );
}

export function Ticket80({ d }: { d: DatosTicket }) {
  return (
    <HojaTicket80 empresa={d.empresa} logo={d.logo}>
        <div className="tit">{d.titulo} N° {String(d.numero).padStart(6, "0")}</div>
        {d.estado === "anulada" && <div className="c b">*** ANULADA ***</div>}
        <div className="c">{fechaHora(d.fecha)}</div>

        <div className="lin" />
        <div><span className="b">Nombre: </span>{d.contraparte}</div>
        {d.documento && <div><span className="b">Doc.: </span>{d.documento}</div>}
        <div className="lin" />

        {d.items.map((it, i) => (
          <div key={i} className="item">
            <div className="b">{it.metal}</div>
            {it.bruto && (
              <div className="fila"><span>Bruto {kg(it.bruto)}</span><span>Desc. {kg(it.descuento)}</span></div>
            )}
            <div className="fila">
              <span>{kg(it.neto)} x {it.precio ? soles(it.precio) : "—"}</span>
              <span className="b">{it.importe ? soles(it.importe) : "—"}</span>
            </div>
          </div>
        ))}

        <div className="lin" />
        <div className="fila total"><span>TOTAL</span><span>{soles(d.total)}</span></div>
        {(d.extras ?? []).map(([a, b]) => (
          <div key={a} className="fila"><span>{a}</span><span className="b">{b}</span></div>
        ))}
        {d.medio_pago && <div>Pago: {ETIQUETA_MEDIO[d.medio_pago] ?? d.medio_pago}</div>}
        {d.notas && <div className="peq" style={{ marginTop: 4 }}>Nota: {d.notas}</div>}
        <div className="lin" />
        <div className="c peq">{d.pie ?? "Gracias por su preferencia"}</div>
        <div className="c peq">Documento interno · no es comprobante de pago</div>
    </HojaTicket80>
  );
}
