import "server-only";
import type { Contexto } from "./contexto";
import { inicioMesLima, hoyLima, nombrePeriodo, ETIQUETA_ORIGEN } from "./formato";

// Registro de reportes. Cada uno solo LEE de funciones/vistas de la BD: los números se calculan allá.

export type TipoCol = "texto" | "soles" | "kg" | "num" | "pct" | "fecha" | "precio";
export interface Col {
  clave: string;
  titulo: string;
  tipo: TipoCol;
  /** Sumar en la fila de totales */
  sumar?: boolean;
}
export interface Filtros {
  desde: string;
  hasta: string;
  agrupar?: string;
  metal?: string;
  caja?: string;
}
export interface DatosReporte {
  columnas: Col[];
  filas: Record<string, unknown>[];
  nota?: string;
}

export interface DefReporte {
  id: string;
  titulo: string;
  descripcion: string;
  agrupaciones?: { valor: string; texto: string }[];
  usaMetal?: boolean;
  usaCaja?: boolean;
  obtener: (ctx: Pick<Contexto, "supabase" | "empresa">, f: Filtros) => Promise<DatosReporte>;
}

function chequear<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as T;
}

export const REPORTES: DefReporte[] = [
  {
    id: "compras",
    titulo: "Compras",
    descripcion: "Kilos, soles y precio promedio comprado",
    agrupaciones: [
      { valor: "dia", texto: "Por día" }, { valor: "semana", texto: "Por semana" }, { valor: "mes", texto: "Por mes" },
      { valor: "anio", texto: "Por año" }, { valor: "familia", texto: "Por familia" }, { valor: "metal", texto: "Por producto" },
      { valor: "proveedor", texto: "Por proveedor" }, { valor: "clase", texto: "Mayorista / minorista" },
    ],
    async obtener({ supabase, empresa }, f) {
      const filas = chequear(await supabase.rpc("rpt_compras", { p_empresa: empresa.id, p_desde: f.desde, p_hasta: f.hasta, p_agrupar: f.agrupar ?? "dia" }));
      return {
        columnas: [
          { clave: "etiqueta", titulo: "Grupo", tipo: "texto" },
          { clave: "n_compras", titulo: "Compras", tipo: "num", sumar: true },
          { clave: "kg", titulo: "Kg", tipo: "kg", sumar: true },
          { clave: "importe", titulo: "Importe", tipo: "soles", sumar: true },
          { clave: "precio_promedio", titulo: "Precio prom./kg", tipo: "precio" },
        ],
        filas,
      };
    },
  },
  {
    id: "ventas",
    titulo: "Ventas",
    descripcion: "Ventas confirmadas: kilos, merma e ingresos",
    agrupaciones: [
      { valor: "mes", texto: "Por mes" }, { valor: "dia", texto: "Por día" }, { valor: "semana", texto: "Por semana" },
      { valor: "anio", texto: "Por año" }, { valor: "familia", texto: "Por familia" }, { valor: "metal", texto: "Por producto" },
      { valor: "comprador", texto: "Por cliente" },
    ],
    async obtener({ supabase, empresa }, f) {
      const filas = chequear(await supabase.rpc("rpt_ventas", { p_empresa: empresa.id, p_desde: f.desde, p_hasta: f.hasta, p_agrupar: f.agrupar ?? "mes" }));
      return {
        columnas: [
          { clave: "etiqueta", titulo: "Grupo", tipo: "texto" },
          { clave: "n_ventas", titulo: "Ventas", tipo: "num", sumar: true },
          { clave: "kg_salida", titulo: "Kg salida", tipo: "kg", sumar: true },
          { clave: "kg_recibido", titulo: "Kg recibido", tipo: "kg", sumar: true },
          { clave: "merma_kg", titulo: "Merma kg", tipo: "kg", sumar: true },
          { clave: "importe", titulo: "Importe", tipo: "soles", sumar: true },
          { clave: "precio_promedio", titulo: "Precio prom./kg", tipo: "precio" },
        ],
        filas,
      };
    },
  },
  {
    id: "margen",
    titulo: "Margen por producto",
    descripcion: "Precio promedio de venta − costo promedio, en S/ por kg y %",
    async obtener({ supabase, empresa }, f) {
      const filas = chequear(await supabase.rpc("rpt_margen_metal", { p_empresa: empresa.id, p_desde: f.desde, p_hasta: f.hasta }));
      return {
        columnas: [
          { clave: "metal", titulo: "Producto", tipo: "texto" },
          { clave: "kg_vendidos", titulo: "Kg vendidos", tipo: "kg", sumar: true },
          { clave: "ventas", titulo: "Ventas", tipo: "soles", sumar: true },
          { clave: "costo_vendido", titulo: "Costo", tipo: "soles", sumar: true },
          { clave: "precio_prom_venta", titulo: "Venta/kg", tipo: "precio" },
          { clave: "costo_prom", titulo: "Costo/kg", tipo: "precio" },
          { clave: "margen_kg", titulo: "Margen/kg", tipo: "precio" },
          { clave: "margen_pct", titulo: "Margen %", tipo: "pct" },
          { clave: "margen_total", titulo: "Margen S/", tipo: "soles", sumar: true },
        ],
        filas,
      };
    },
  },
  {
    id: "merma",
    titulo: "Merma total",
    descripcion: "Diferencia de pesos en ventas + limpieza y ajustes, valorizada a costo",
    async obtener({ supabase, empresa }, f) {
      const filas = chequear(await supabase.rpc("rpt_merma", { p_empresa: empresa.id, p_desde: f.desde, p_hasta: f.hasta }));
      return {
        columnas: [
          { clave: "metal", titulo: "Producto", tipo: "texto" },
          { clave: "merma_venta_kg", titulo: "En ventas kg", tipo: "kg", sumar: true },
          { clave: "merma_venta_costo", titulo: "En ventas S/", tipo: "soles", sumar: true },
          { clave: "merma_ajuste_kg", titulo: "Limpieza y ajustes kg", tipo: "kg", sumar: true },
          { clave: "merma_ajuste_costo", titulo: "Limpieza y ajustes S/", tipo: "soles", sumar: true },
          { clave: "total_kg", titulo: "Total kg", tipo: "kg", sumar: true },
          { clave: "total_costo", titulo: "Total S/", tipo: "soles", sumar: true },
        ],
        filas,
        nota: "Valores positivos = pérdida; negativos = sobrante. «Limpieza y ajustes» incluye la diferencia de precio del material separado. No incluye reclasificaciones.",
      };
    },
  },
  {
    id: "merma-limpieza",
    titulo: "Merma de limpieza",
    descripcion: "Kilos limpiados, merma en kg, % y S/, y material separado a otro producto",
    agrupaciones: [{ valor: "metal", texto: "Por producto" }, { valor: "proveedor", texto: "Por proveedor" }, { valor: "compra", texto: "Por compra" }],
    async obtener({ supabase, empresa }, f) {
      const filas = chequear(await supabase.rpc("rpt_merma_limpieza", { p_empresa: empresa.id, p_desde: f.desde, p_hasta: f.hasta, p_agrupar: f.agrupar ?? "metal" }));
      return {
        columnas: [
          { clave: "etiqueta", titulo: "Grupo", tipo: "texto" },
          { clave: "n_limpiezas", titulo: "Limpiezas", tipo: "num" },
          { clave: "kg_limpiado", titulo: "Kg limpiados", tipo: "kg", sumar: true },
          { clave: "merma_kg", titulo: "Merma kg", tipo: "kg", sumar: true },
          { clave: "merma_pct", titulo: "Merma %", tipo: "pct" },
          { clave: "merma_soles", titulo: "Merma S/", tipo: "soles", sumar: true },
          { clave: "traslado_kg", titulo: "Separado kg", tipo: "kg", sumar: true },
          { clave: "diferencia_soles", titulo: "Dif. precio separado S/", tipo: "soles", sumar: true },
        ],
        filas,
        nota: "Ordenado de mayor a menor % de merma. La merma no debería ser grande: revise los productos caros (cobre) con % alto.",
      };
    },
  },
  {
    id: "kardex",
    titulo: "Kardex",
    descripcion: "Entradas, salidas y saldo por producto",
    usaMetal: true,
    async obtener({ supabase }, f) {
      if (!f.metal) return { columnas: [], filas: [], nota: "Elija un producto." };
      const filas = chequear(await supabase.from("v_kardex").select("*").eq("metal_id", f.metal)
        .gte("fecha", `${f.desde}T00:00:00-05:00`).lte("fecha", `${f.hasta}T23:59:59.999-05:00`)
        .order("fecha").order("creado_en"));
      return {
        columnas: [
          { clave: "fecha", titulo: "Fecha", tipo: "fecha" },
          { clave: "tipo", titulo: "Tipo", tipo: "texto" },
          { clave: "detalle", titulo: "Detalle", tipo: "texto" },
          { clave: "kg", titulo: "Kg", tipo: "kg" },
          { clave: "costo_kg", titulo: "Costo/kg", tipo: "precio" },
          { clave: "costo_total", titulo: "Costo", tipo: "soles" },
          { clave: "saldo_kg", titulo: "Saldo kg", tipo: "kg" },
          { clave: "saldo_costo", titulo: "Saldo S/", tipo: "soles" },
        ],
        filas: (filas as Record<string, unknown>[]).map((k) => ({ ...k, tipo: k.anulado ? `${k.tipo} (anulado)` : k.tipo })),
      };
    },
  },
  {
    id: "caja",
    titulo: "Libro de caja",
    descripcion: "Movimientos con saldo inicial y acumulado",
    usaCaja: true,
    async obtener({ supabase, empresa }, f) {
      const filas = chequear(await supabase.rpc("rpt_libro_caja", { p_empresa: empresa.id, p_desde: f.desde, p_hasta: f.hasta, p_caja: f.caja || null }));
      return {
        columnas: [
          { clave: "fecha", titulo: "Fecha", tipo: "fecha" },
          { clave: "caja", titulo: "Caja", tipo: "texto" },
          { clave: "origen", titulo: "Origen", tipo: "texto" },
          { clave: "concepto", titulo: "Concepto", tipo: "texto" },
          { clave: "ingreso", titulo: "Ingreso", tipo: "soles", sumar: true },
          { clave: "egreso", titulo: "Egreso", tipo: "soles", sumar: true },
          { clave: "saldo", titulo: "Saldo", tipo: "soles" },
        ],
        filas: (filas as Record<string, unknown>[]).map((r) => ({ ...r, origen: ETIQUETA_ORIGEN[String(r.origen)] ?? r.origen })),
      };
    },
  },
  {
    id: "resultados",
    titulo: "Estado de resultados",
    descripcion: "Mensual, con comparación entre meses",
    async obtener({ supabase, empresa }, f) {
      const filas = chequear(await supabase.from("v_resultado_mes").select("*").eq("empresa_id", empresa.id)
        .gte("periodo", f.desde.slice(0, 7)).lte("periodo", f.hasta.slice(0, 7)).order("periodo"));
      return {
        columnas: [
          { clave: "mes", titulo: "Mes", tipo: "texto" },
          { clave: "ventas", titulo: "Ventas", tipo: "soles", sumar: true },
          { clave: "costo_ventas", titulo: "Costo de ventas", tipo: "soles", sumar: true },
          { clave: "margen_bruto", titulo: "Margen bruto", tipo: "soles", sumar: true },
          { clave: "merma_venta", titulo: "Merma ventas", tipo: "soles", sumar: true },
          { clave: "merma_ajustes", titulo: "Merma ajustes", tipo: "soles", sumar: true },
          { clave: "gastos", titulo: "Gastos", tipo: "soles", sumar: true },
          { clave: "ajustes_caja", titulo: "Ajustes caja", tipo: "soles", sumar: true },
          { clave: "utilidad", titulo: "Utilidad", tipo: "soles", sumar: true },
          { clave: "compras", titulo: "Compras (inf.)", tipo: "soles", sumar: true },
        ],
        filas: (filas as Record<string, unknown>[]).map((r) => ({ ...r, mes: nombrePeriodo(String(r.periodo)) })),
        nota: "Utilidad = ventas − costo de lo vendido − mermas − gastos ± ajustes de caja. Las compras no son gasto: pasan a inventario.",
      };
    },
  },
  {
    id: "patrimonio",
    titulo: "Patrimonio: ¿cuánto tenemos?",
    descripcion: "Caja + stock valorizado vs. capital → ganancia acumulada (a hoy)",
    async obtener({ supabase, empresa }) {
      const [p, cajas, stock] = await Promise.all([
        supabase.from("v_patrimonio").select("*").eq("empresa_id", empresa.id).single(),
        supabase.from("v_saldo_caja").select("nombre, saldo").eq("empresa_id", empresa.id).order("orden"),
        supabase.from("v_stock_metal").select("nombre, ruta, kg, valor_costo").eq("empresa_id", empresa.id).neq("kg", 0).order("clave_orden"),
      ]);
      if (p.error) throw new Error(p.error.message);
      const v = p.data;
      const filas: Record<string, unknown>[] = [
        ...(cajas.data ?? []).map((c) => ({ concepto: `Caja: ${c.nombre}`, kg: null, monto: c.saldo })),
        { concepto: "Total caja", kg: null, monto: v.caja, _fuerte: true },
        ...(stock.data ?? []).map((s) => ({ concepto: `Stock: ${s.ruta ?? s.nombre}`, kg: s.kg, monto: s.valor_costo })),
        { concepto: "Mercadería en tránsito (ventas pendientes)", kg: null, monto: v.en_transito },
        { concepto: "Total mercadería a costo", kg: null, monto: Number(v.stock_costo) + Number(v.en_transito), _fuerte: true },
        { concepto: "LO QUE TENEMOS (caja + mercadería)", kg: null, monto: v.activos, _fuerte: true },
        { concepto: "Aportes de socios", kg: null, monto: v.aportes },
        { concepto: "Retiros de socios", kg: null, monto: -Number(v.retiros) },
        { concepto: "Capital neto", kg: null, monto: v.capital, _fuerte: true },
        { concepto: "GANANCIA ACUMULADA", kg: null, monto: v.ganancia_acumulada, _fuerte: true },
        { concepto: "(Referencia) Stock a precio de venta del día", kg: null, monto: v.stock_precio_venta },
      ];
      return {
        columnas: [
          { clave: "concepto", titulo: "Concepto", tipo: "texto" },
          { clave: "kg", titulo: "Kg", tipo: "kg" },
          { clave: "monto", titulo: "S/", tipo: "soles" },
        ],
        filas,
        nota: "Foto a la fecha de hoy. Para meses cerrados vea el snapshot en Socios → Cierres de mes.",
      };
    },
  },
  {
    id: "ranking",
    titulo: "Ranking de proveedores",
    descripcion: "Quién nos vende más (útil para el sorteo de Navidad)",
    async obtener({ supabase, empresa }, f) {
      const filas = chequear(await supabase.rpc("rpt_ranking_proveedores", { p_empresa: empresa.id, p_desde: f.desde, p_hasta: f.hasta }));
      return {
        columnas: [
          { clave: "puesto", titulo: "#", tipo: "num" },
          { clave: "nombre", titulo: "Proveedor", tipo: "texto" },
          { clave: "documento", titulo: "Documento", tipo: "texto" },
          { clave: "n_compras", titulo: "Compras", tipo: "num", sumar: true },
          { clave: "kg", titulo: "Kg", tipo: "kg", sumar: true },
          { clave: "importe", titulo: "Importe", tipo: "soles", sumar: true },
          { clave: "ultima_compra", titulo: "Última", tipo: "fecha" },
        ],
        filas: (filas as Record<string, unknown>[]).map((r, i) => ({ puesto: i + 1, ...r })),
      };
    },
  },
];

export function filtrosDesde(sp: Record<string, string | undefined>): Filtros {
  const fecha = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return {
    desde: fecha(sp.desde) ?? inicioMesLima(),
    hasta: fecha(sp.hasta) ?? hoyLima(),
    agrupar: sp.agrupar,
    metal: sp.metal,
    caja: sp.caja,
  };
}

/** Suma exacta en céntimos/gramos para la fila de totales (evita errores de float al presentar) */
export function totales(d: DatosReporte): Record<string, number> | null {
  const sumables = d.columnas.filter((c) => c.sumar);
  if (!sumables.length || d.filas.length < 2) return null;
  const t: Record<string, number> = {};
  for (const c of sumables) {
    const f = c.tipo === "kg" ? 1000 : c.tipo === "soles" ? 100 : 1;
    t[c.clave] = d.filas.reduce((s, r) => s + Math.round(Number(r[c.clave] ?? 0) * f), 0) / f;
  }
  return t;
}
