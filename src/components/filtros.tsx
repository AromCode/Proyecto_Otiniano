import { claseBoton, claseInput, cx } from "@/components/ui/clases";

export interface OpcionFiltro {
  valor: string;
  texto: string;
}

/** Filtros por GET (funcionan sin JavaScript y quedan en la URL para compartir). */
export function Filtros({
  valores, desdeHasta = true, selects = [], busqueda, ocultos = {},
}: {
  valores: Record<string, string | undefined>;
  /** Parámetros que se conservan al filtrar (p. ej. la pestaña activa) */
  ocultos?: Record<string, string>;
  desdeHasta?: boolean;
  selects?: { nombre: string; etiqueta: string; opciones: OpcionFiltro[] }[];
  busqueda?: { nombre: string; placeholder: string };
}) {
  return (
    <form method="get" className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
      {Object.entries(ocultos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {busqueda && (
        <label className="col-span-2 block sm:w-56">
          <span className="mb-1 block text-xs font-medium text-stone-600">Buscar</span>
          <input name={busqueda.nombre} defaultValue={valores[busqueda.nombre] ?? ""} placeholder={busqueda.placeholder} className={claseInput} />
        </label>
      )}
      {desdeHasta && (
        <>
          <label className="block sm:w-40">
            <span className="mb-1 block text-xs font-medium text-stone-600">Desde</span>
            <input type="date" name="desde" defaultValue={valores.desde ?? ""} className={claseInput} />
          </label>
          <label className="block sm:w-40">
            <span className="mb-1 block text-xs font-medium text-stone-600">Hasta</span>
            <input type="date" name="hasta" defaultValue={valores.hasta ?? ""} className={claseInput} />
          </label>
        </>
      )}
      {selects.map((s) => (
        <label key={s.nombre} className="block sm:w-44">
          <span className="mb-1 block text-xs font-medium text-stone-600">{s.etiqueta}</span>
          <select name={s.nombre} defaultValue={valores[s.nombre] ?? ""} className={claseInput}>
            <option value="">Todos</option>
            {s.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
        </label>
      ))}
      <button className={cx(claseBoton("secundario", "md"), "col-span-2 h-[42px] sm:col-span-1")}>Filtrar</button>
    </form>
  );
}

/** Convierte YYYY-MM-DD (hora Lima) a límites ISO para filtrar timestamptz */
export function rangoLima(desde?: string, hasta?: string) {
  const ok = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
  const d = ok(desde);
  const h = ok(hasta);
  return {
    desde: d ? `${d}T00:00:00-05:00` : undefined,
    hasta: h ? new Date(new Date(`${h}T00:00:00-05:00`).getTime() + 86400000).toISOString() : undefined,
  };
}
