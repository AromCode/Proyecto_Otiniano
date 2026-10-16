// Verifica que los scripts de alta y datos demo corren sin errores y que todo cuadra.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { como, crearDb, uno } from "./harness";

const DUENO = "44444444-4444-4444-4444-444444444444";

describe("Scripts de Supabase", () => {
  it("01_crear_empresa + 02_datos_demo cargan y el patrimonio cuadra", async () => {
    const db = await crearDb();
    await db.query(`insert into auth.users (id, email) values ($1, 'dueno@ejemplo.com')`, [DUENO]);
    await db.exec(readFileSync("supabase/scripts/01_crear_empresa.sql", "utf8"));
    await db.exec(readFileSync("supabase/scripts/02_datos_demo.sql", "utf8"));

    const r = await como(db, DUENO, async (tx) => ({
      compras: await uno<{ n: number }>(tx, `select count(*)::int n from compras`),
      ventas: await uno<{ n: number }>(tx, `select count(*)::int n from ventas`),
      p: await uno<Record<string, string>>(tx, `select p.* from v_patrimonio p join empresas e on e.id = p.empresa_id where e.razon_social like 'Metales Demo%'`),
      res: await uno<{ s: string }>(tx, `select sum(r.utilidad) s from v_resultado_mes r join empresas e on e.id = r.empresa_id where e.razon_social like 'Metales Demo%'`),
      dash: await uno<{ d: Record<string, unknown> }>(tx, `select dashboard(id) d from empresas where razon_social like 'Metales Demo%'`),
      rc: await uno<{ d: Record<string, string> }>(tx, `select resumen_compras(id) d from empresas where razon_social like 'Metales Demo%'`),
      rv: await uno<{ d: Record<string, string> }>(tx, `select resumen_ventas(id) d from empresas where razon_social like 'Metales Demo%'`),
      ri: await uno<{ d: Record<string, string> }>(tx, `select resumen_inventario(id) d from empresas where razon_social like 'Metales Demo%'`),
      pm: await tx.query(`select * from proveedor_por_metal((select id from proveedores where nro_doc = '40000001'))`),
      cm: await tx.query(`select * from comprador_por_metal((select id from compradores where ruc = '20999999991'))`),
      reportes: await Promise.all([
        tx.query(`select * from rpt_compras((select id from empresas where razon_social like 'Metales Demo%'), current_date - 1, current_date + 1, 'metal')`),
        tx.query(`select * from rpt_ventas((select id from empresas where razon_social like 'Metales Demo%'), current_date - 1, current_date + 1, 'comprador')`),
        tx.query(`select * from rpt_margen_metal((select id from empresas where razon_social like 'Metales Demo%'), current_date - 1, current_date + 1)`),
        tx.query(`select * from rpt_merma((select id from empresas where razon_social like 'Metales Demo%'), current_date - 1, current_date + 1)`),
        tx.query(`select * from rpt_libro_caja((select id from empresas where razon_social like 'Metales Demo%'), current_date - 1, current_date + 1)`),
        tx.query(`select * from rpt_ranking_proveedores((select id from empresas where razon_social like 'Metales Demo%'), current_date - 1, current_date + 1)`),
        tx.query(`select * from v_kardex`),
      ]),
    }));

    expect(r.compras.n).toBe(12);
    expect(r.ventas.n).toBe(2);
    expect(Number(r.p.capital)).toBe(20000);
    expect(Number(r.p.en_transito)).toBeGreaterThan(0);
    // Ganancia acumulada (patrimonio − capital) = suma de utilidades del estado de resultados
    expect(Number(r.p.ganancia_acumulada).toFixed(2)).toBe(Number(r.res.s).toFixed(2));
    expect(r.dash.d).toHaveProperty("caja");
    // Resúmenes de módulo: cuadran con el patrimonio y con las ventas cargadas
    expect(Number(r.rc.d.mes_n)).toBe(12);
    expect(Number(r.rv.d.mes_n)).toBe(1);
    expect(Number(r.rv.d.pendientes_n)).toBe(1);
    expect(Number(r.ri.d.valor_costo).toFixed(2)).toBe(Number(r.p.stock_costo).toFixed(2));
    expect(Number(r.ri.d.en_transito).toFixed(2)).toBe(Number(r.p.en_transito).toFixed(2));
    expect(r.pm.rows.length).toBeGreaterThan(0);
    expect(r.cm.rows).toHaveLength(1);
    for (const rep of r.reportes) expect(rep.rows.length).toBeGreaterThan(0);
  });
});
