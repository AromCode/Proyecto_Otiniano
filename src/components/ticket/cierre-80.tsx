import { ETIQUETA_ORIGEN, fechaHora, soles } from "@/lib/formato";
import type { DatosTicket } from "@/lib/pdf/ticket";
import type { ResumenTurno } from "@/lib/tipos";
import { HojaTicket80 } from "./ticket-80";

// Cierre de caja (o corte parcial si el turno sigue abierto) en 80 mm. Todos los montos vienen de resumen_turno().
export function Cierre80({ r, empresa, logo }: { r: ResumenTurno; empresa: DatosTicket["empresa"]; logo?: string | null }) {
  const abierto = !r.cerrado_en;
  const ingresos = r.detalle.filter((d) => d.tipo === "ingreso");
  const egresos = r.detalle.filter((d) => d.tipo === "egreso");
  const dif = Number(r.diferencia_cierre ?? 0);
  const linea = (d: ResumenTurno["detalle"][number]) => (
    <div key={d.origen + d.tipo} className="fila">
      <span>{ETIQUETA_ORIGEN[d.origen] ?? d.origen} ({d.cantidad})</span>
      <span>{d.tipo === "egreso" ? "- " : ""}{soles(d.monto)}</span>
    </div>
  );

  return (
    <HojaTicket80 empresa={empresa} logo={logo}>
      <div className="tit">{abierto ? "CORTE PARCIAL" : "CIERRE DE CAJA"}</div>
      <div className="c b">Turno N° {String(r.numero).padStart(6, "0")} · {r.caja}</div>
      {abierto && <div className="c">*** La caja sigue abierta ***</div>}

      <div className="lin" />
      <div className="fila"><span>Apertura</span><span>{fechaHora(r.abierto_en)}</span></div>
      {r.abierto_por && <div className="peq">Abrió: {r.abierto_por}</div>}
      <div className="fila"><span>{abierto ? "Corte" : "Cierre"}</span><span>{fechaHora(r.cerrado_en ?? new Date())}</span></div>
      {r.cerrado_por && <div className="peq">Cerró: {r.cerrado_por}</div>}

      <div className="lin" />
      <div className="fila"><span>Saldo inicial (sistema)</span><span>{soles(r.saldo_apertura)}</span></div>
      <div className="fila"><span>Contado al abrir</span><span>{soles(r.contado_apertura)}</span></div>
      {Number(r.diferencia_apertura) !== 0 && (
        <div className="fila peq"><span>Diferencia al abrir</span><span>{soles(r.diferencia_apertura)}</span></div>
      )}

      <div className="sec">Ingresos</div>
      {ingresos.length ? ingresos.map(linea) : <div className="peq">Sin ingresos</div>}
      <div className="fila b"><span>Total ingresos</span><span>{soles(r.ingresos)}</span></div>

      <div className="sec">Egresos</div>
      {egresos.length ? egresos.map(linea) : <div className="peq">Sin egresos</div>}
      <div className="fila b"><span>Total egresos</span><span>- {soles(r.egresos)}</span></div>

      <div className="lin" />
      <div className="fila b"><span>Saldo esperado</span><span>{soles(r.esperado)}</span></div>
      {Number(r.otros) !== 0 && (
        <div className="fila peq"><span>Anulaciones de otros días</span><span>{soles(r.otros)}</span></div>
      )}

      {!abierto && (
        <>
          <div className="fila"><span>Saldo del sistema</span><span>{soles(r.saldo_sistema)}</span></div>
          <div className="fila total"><span>CONTADO</span><span>{soles(r.contado_cierre)}</span></div>
          <div className="fila b">
            <span>{dif === 0 ? "Cuadra exacto" : dif > 0 ? "SOBRANTE" : "FALTANTE"}</span>
            <span>{soles(Math.abs(dif))}</span>
          </div>
          {r.ajustado && <div className="peq">Caja ajustada a lo contado.</div>}
        </>
      )}
      {r.anulados > 0 && <div className="peq">Movimientos anulados en el turno: {r.anulados}</div>}
      {r.nota_apertura && <div className="peq">Nota apertura: {r.nota_apertura}</div>}
      {r.nota_cierre && <div className="peq">Nota cierre: {r.nota_cierre}</div>}

      <div className="firmas"><div>Cajero</div><div>Supervisor</div></div>
    </HojaTicket80>
  );
}
