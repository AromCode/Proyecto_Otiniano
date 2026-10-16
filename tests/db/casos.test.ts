// Casos de prueba mínimos de la propuesta (§8) + aislamiento multiempresa (fase 0).
// Corren contra PGlite: pnpm test
import { beforeAll, describe, expect, it } from "vitest";
import { como, crearDb, uno, type Db } from "./harness";

const DUENO_A = "11111111-1111-1111-1111-111111111111";
const DUENO_B = "22222222-2222-2222-2222-222222222222";
const CAJERO_A = "33333333-3333-3333-3333-333333333333";

let db: Db;
let empA: string, empB: string, caja: string, cobre: string, bronce: string, comprador: string;

const num = (v: unknown) => Number(v);

async function stock(metal: string) {
  return como(db, DUENO_A, (tx) =>
    uno<{ kg: string; costo_total: string; costo_promedio: string | null }>(
      tx, `select kg, costo_total, costo_promedio from v_stock_metal where metal_id = $1`, [metal]));
}
async function saldoCaja() {
  return como(db, DUENO_A, (tx) =>
    uno<{ saldo: string }>(tx, `select saldo from v_saldo_caja where caja_id = $1`, [caja])).then((r) => num(r.saldo));
}
async function comprar(metal: string, bruto: string, desc: string, precio: string, user = DUENO_A) {
  return como(db, user, (tx) =>
    uno<{ r: { id: string; total: number } }>(tx,
      `select registrar_compra($1, $2::jsonb, $3) as r`,
      [empA, JSON.stringify([{ metal_id: metal, peso_bruto_kg: bruto, descuento_kg: desc, precio_kg: precio }]), caja],
    )).then((x) => x.r);
}

beforeAll(async () => {
  db = await crearDb();
  await db.query(`insert into auth.users (id, email) values ($1,'a@x.pe'), ($2,'b@x.pe'), ($3,'c@x.pe')`,
    [DUENO_A, DUENO_B, CAJERO_A]);
  empA = (await uno<{ id: string }>(db, `select admin_crear_empresa('Metales A SAC', null, 'a@x.pe') as id`)).id;
  empB = (await uno<{ id: string }>(db, `select admin_crear_empresa('Metales B SAC', null, 'b@x.pe') as id`)).id;
  await db.query(`select admin_agregar_miembro($1, $2, 'cajero', 'Cajero', 'c@x.pe')`, [empA, CAJERO_A]);
  caja = (await uno<{ id: string }>(db, `select id from cajas where empresa_id = $1 and tipo = 'efectivo'`, [empA])).id;

  await como(db, DUENO_A, async (tx) => {
    cobre = (await uno<{ id: string }>(tx,
      `insert into metales (empresa_id, nombre, precio_compra, precio_venta) values ($1, 'Cobre', 30, 34) returning id`, [empA])).id;
    bronce = (await uno<{ id: string }>(tx,
      `insert into metales (empresa_id, nombre, precio_compra, precio_venta) values ($1, 'Bronce', 20, 23) returning id`, [empA])).id;
    comprador = (await uno<{ id: string }>(tx,
      `insert into compradores (empresa_id, ruc, razon_social) values ($1, '20123456789', 'Fundición Lima SAC') returning id`, [empA])).id;
    // Capital inicial para que la caja tenga fondos
    const socio = (await uno<{ id: string }>(tx,
      `insert into socios (empresa_id, nombre, porcentaje) values ($1, 'Socio 1', 100) returning id`, [empA])).id;
    await tx.query(`select registrar_aporte_retiro($1, $2, 'aporte', 20000, $3)`, [empA, socio, caja]);
  });
});

describe("Fase 0 · multiempresa", () => {
  it("un usuario de la empresa B no ve nada de la A", async () => {
    await comprar(cobre, "1", "0", "30");
    const r = await como(db, DUENO_B, async (tx) => ({
      empresas: (await tx.query(`select id from empresas`)).rows,
      metales: (await tx.query(`select id from metales`)).rows,
      compras: (await tx.query(`select id from compras`)).rows,
      caja: (await tx.query(`select id from movimientos_caja`)).rows,
      stock: (await tx.query(`select * from v_stock_metal`)).rows,
      patrimonio: (await tx.query(`select * from v_patrimonio`)).rows,
    }));
    expect(r.empresas.map((e) => (e as { id: string }).id)).toEqual([empB]);
    expect(r.metales).toHaveLength(0);
    expect(r.compras).toHaveLength(0);
    expect(r.caja).toHaveLength(0);
    expect(r.stock).toHaveLength(0);
    expect(r.patrimonio).toHaveLength(1);
  });

  it("B no puede comprar en la empresa A", async () => {
    await expect(como(db, DUENO_B, (tx) =>
      tx.query(`select registrar_compra($1, '[]'::jsonb, $2)`, [empA, caja]))).rejects.toThrow(/No pertenece/);
  });

  it("no se puede escribir directo en compras ni movimientos_caja", async () => {
    await expect(como(db, DUENO_A, (tx) =>
      tx.query(`insert into movimientos_caja (empresa_id, caja_id, tipo, origen, monto) values ($1,$2,'ingreso','ajuste',100)`,
        [empA, caja]))).rejects.toThrow();
  });

  it("el cajero no edita precios del día ni anula", async () => {
    await expect(como(db, CAJERO_A, (tx) =>
      tx.query(`update metales set precio_compra = 1 where id = $1 returning id`, [cobre]).then((r) => {
        if (r.rows.length === 0) throw new Error("sin permiso");
      }))).rejects.toThrow();
    await expect(comprar(cobre, "1", "0", "25", CAJERO_A)).rejects.toThrow(/permiso para cambiar el precio/);
  });
});

describe("Casos de prueba §8", () => {
  it("1. compra 5.250 kg de cobre a S/ 30 con 0.250 de descuento", async () => {
    const s0 = await stock(cobre);
    const c0 = await saldoCaja();
    const r = await comprar(cobre, "5.250", "0.250", "30");
    expect(num(r.total)).toBe(150);
    expect(await saldoCaja()).toBeCloseTo(c0 - 150, 2);
    expect(num((await stock(cobre)).kg)).toBeCloseTo(num(s0.kg) + 5, 3);
  });

  it("2. dos compras a precios distintos → costo promedio ponderado", async () => {
    // bronce: 10 kg a 20 + 30 kg a 24 = 200 + 720 = 920 / 40 = 23
    await comprar(bronce, "10", "0", "20");
    await como(db, DUENO_A, (tx) => tx.query(`update metales set precio_compra = 24 where id = $1`, [bronce]));
    await comprar(bronce, "30", "0", "24");
    const s = await stock(bronce);
    expect(num(s.kg)).toBe(40);
    expect(num(s.costo_promedio)).toBe(23);
  });

  it("3. venta 4.000 kg salida, comprador recibe 3.950 → merma 0.050 valorizada a costo", async () => {
    // Bronce a costo 23: salida 4 kg = 92.00; recibido 3.95 → merma 0.05 × 23 = 1.15
    const v = await como(db, DUENO_A, (tx) =>
      uno<{ r: { id: string; estado: string } }>(tx, `select registrar_venta($1, $2, $3::jsonb) as r`,
        [empA, comprador, JSON.stringify([{ metal_id: bronce, peso_salida_kg: "4.000" }])])).then((x) => x.r);
    expect(v.estado).toBe("pendiente");
    expect(num((await stock(bronce)).kg)).toBe(36);

    const item = await como(db, DUENO_A, (tx) =>
      uno<{ id: string }>(tx, `select id from venta_items where venta_id = $1`, [v.id]));
    const c0 = await saldoCaja();
    await como(db, DUENO_A, (tx) => tx.query(`select confirmar_venta($1, $2::jsonb, $3, 'efectivo')`,
      [v.id, JSON.stringify([{ item_id: item.id, peso_recibido_kg: "3.950", precio_kg: "26" }]), caja]));

    const vi = await como(db, DUENO_A, (tx) =>
      uno<{ merma_kg: string; merma_costo: string; importe: string }>(tx,
        `select merma_kg, merma_costo, importe from venta_items where id = $1`, [item.id]));
    expect(num(vi.merma_kg)).toBe(0.05);
    expect(num(vi.merma_costo)).toBeCloseTo(1.15, 4);
    expect(num(vi.importe)).toBe(102.7);
    expect(await saldoCaja()).toBeCloseTo(c0 + 102.7, 2);
  });

  it("4. vender más que el stock → la BD lo rechaza con mensaje claro", async () => {
    await expect(como(db, DUENO_A, (tx) =>
      tx.query(`select registrar_venta($1, $2, $3::jsonb)`,
        [empA, comprador, JSON.stringify([{ metal_id: bronce, peso_salida_kg: "1000" }])])))
      .rejects.toThrow(/Stock insuficiente de Bronce: hay 36\.000 kg/);
  });

  it("5. anular una compra → caja y stock vuelven; queda quién y por qué", async () => {
    const s0 = await stock(cobre);
    const c0 = await saldoCaja();
    const r = await comprar(cobre, "2", "0", "30");
    await como(db, DUENO_A, (tx) => tx.query(`select anular_compra($1, 'Error de digitación')`, [r.id]));
    expect(await saldoCaja()).toBeCloseTo(c0, 2);
    const s1 = await stock(cobre);
    expect(num(s1.kg)).toBe(num(s0.kg));
    expect(num(s1.costo_total)).toBe(num(s0.costo_total));
    const c = await como(db, DUENO_A, (tx) =>
      uno<{ estado: string; anulado_por: string; motivo_anulacion: string }>(tx,
        `select estado, anulado_por, motivo_anulacion from compras where id = $1`, [r.id]));
    expect(c).toEqual({ estado: "anulada", anulado_por: DUENO_A, motivo_anulacion: "Error de digitación" });
  });

  it("6. cierre de mes → no se puede registrar ni anular en ese mes sin reabrir", async () => {
    const r = await comprar(cobre, "1", "0", "30");
    const periodo = (await uno<{ p: string }>(db, `select periodo_de(now()) as p`)).p;
    await como(db, DUENO_A, (tx) => tx.query(`select cerrar_mes($1, $2)`, [empA, periodo]));
    await expect(comprar(cobre, "1", "0", "30")).rejects.toThrow(/está cerrado/);
    await expect(como(db, DUENO_A, (tx) => tx.query(`select anular_compra($1, 'x')`, [r.id]))).rejects.toThrow(/está cerrado/);
    await como(db, DUENO_A, (tx) => tx.query(`select reabrir_mes($1, $2, 'Corrección')`, [empA, periodo]));
    await comprar(cobre, "1", "0", "30");
  });
});

describe("Patrimonio y resultado", () => {
  it("patrimonio = caja + stock a costo + en tránsito; ganancia = patrimonio − capital", async () => {
    const r = await como(db, DUENO_A, async (tx) => ({
      p: await uno<Record<string, string>>(tx, `select * from v_patrimonio where empresa_id = $1`, [empA]),
      caja: await uno<{ s: string }>(tx, `select sum(saldo) s from v_saldo_caja where empresa_id = $1`, [empA]),
      stock: await uno<{ s: string }>(tx, `select sum(valor_costo) s from v_stock_metal where empresa_id = $1`, [empA]),
      res: await uno<{ s: string }>(tx, `select sum(utilidad) s from v_resultado_mes where empresa_id = $1`, [empA]),
    }));
    expect(num(r.p.caja)).toBeCloseTo(num(r.caja.s), 2);
    expect(num(r.p.stock_costo)).toBeCloseTo(num(r.stock.s), 2);
    expect(num(r.p.capital)).toBe(20000);
    // La ganancia acumulada coincide con la suma de utilidades mensuales
    expect(num(r.p.ganancia_acumulada)).toBeCloseTo(num(r.res.s), 2);
  });
});
