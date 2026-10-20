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

describe("Despacho · selección en almacén y descuentos", () => {
  let prov: string;
  const porCobrar = () => como(db, DUENO_A, (tx) =>
    uno<{ por_cobrar: string }>(tx, `select por_cobrar from v_patrimonio where empresa_id = $1`, [empA])).then((r) => num(r.por_cobrar));
  const saldoProv = () => como(db, DUENO_A, (tx) =>
    uno<{ saldo: string }>(tx, `select saldo from v_saldo_proveedor where proveedor_id = $1`, [prov])).then((r) => num(r.saldo));
  async function comprarA(metal: string, bruto: string, precio: string, aplicar = false) {
    return como(db, DUENO_A, (tx) => uno<{ r: { id: string; total: number; saldo_aplicado: number } }>(tx,
      `select registrar_compra($1, $2::jsonb, $3, 'efectivo', $4, null, null, null, null, $5) as r`,
      [empA, JSON.stringify([{ metal_id: metal, peso_bruto_kg: bruto, precio_kg: precio }]), caja, prov, aplicar])).then((x) => x.r);
  }
  async function seleccionar(compra: string, kg: string, cobrar = true, motivo: string | null = "Tierra") {
    return como(db, DUENO_A, async (tx) => {
      const ci = await uno<{ id: string }>(tx, `select id from compra_items where compra_id = $1`, [compra]);
      return uno<{ r: { id: string; importe: number } }>(tx, `select registrar_seleccion($1, $2::jsonb, $3, $4) as r`,
        [compra, JSON.stringify(kg === "0" ? [] : [{ compra_item_id: ci.id, kg }]), motivo, cobrar]).then((x) => x.r);
    });
  }

  beforeAll(async () => {
    prov = await como(db, DUENO_A, (tx) => uno<{ id: string }>(tx,
      `insert into proveedores (empresa_id, tipo_doc, nro_doc, nombre) values ($1, 'DNI', '41234567', 'Prov Selección') returning id`,
      [empA])).then((r) => r.id);
  });

  it("la compra nueva queda por seleccionar; sin descuento solo se marca conforme", async () => {
    const r = await comprarA(cobre, "10", "30");
    const antes = await como(db, DUENO_A, (tx) => uno<{ por_seleccionar: boolean }>(tx, `select por_seleccionar from v_compras where id = $1`, [r.id]));
    expect(antes.por_seleccionar).toBe(true);
    const s0 = await stock(cobre);
    await seleccionar(r.id, "0", true, null);
    expect(num((await stock(cobre)).kg)).toBe(num(s0.kg));
    await expect(seleccionar(r.id, "0")).rejects.toThrow(/ya fue seleccionada/);
  });

  it("descuento cobrable: sale del stock al precio pagado y queda como saldo a favor (no es pérdida)", async () => {
    const r = await comprarA(cobre, "20", "30");
    const s0 = await stock(cobre);
    const pc0 = await porCobrar();
    const sel = await seleccionar(r.id, "1.5");
    expect(num(sel.importe)).toBe(45);
    const s1 = await stock(cobre);
    expect(num(s1.kg)).toBeCloseTo(num(s0.kg) - 1.5, 3);
    expect(num(s1.costo_total)).toBeCloseTo(num(s0.costo_total) - 45, 2);
    expect(await porCobrar()).toBeCloseTo(pc0 + 45, 2);
    expect(await saldoProv()).toBe(45);
    await expect(seleccionar(r.id, "1")).rejects.toThrow(/ya fue seleccionada/);
  });

  it("descuento sin motivo o mayor a lo comprado → rechazado", async () => {
    const r = await comprarA(cobre, "2", "30");
    await expect(seleccionar(r.id, "1", true, null)).rejects.toThrow(/motivo/);
    await expect(seleccionar(r.id, "3")).rejects.toThrow(/no puede ser mayor a lo comprado/);
  });

  it("la siguiente compra descuenta el saldo a favor del pago en caja", async () => {
    const c0 = await saldoCaja();
    const r = await comprarA(cobre, "3", "30", true);
    expect(num(r.total)).toBe(90);
    expect(num(r.saldo_aplicado)).toBe(45);
    expect(await saldoCaja()).toBeCloseTo(c0 - 45, 2);
    expect(await saldoProv()).toBe(0);
  });

  it("con el saldo ya cobrado no se puede anular la selección; devolución en efectivo cuadra la caja", async () => {
    const sel = await como(db, DUENO_A, (tx) => uno<{ id: string }>(tx,
      `select id from selecciones_compra where proveedor_id = $1 and importe > 0`, [prov]));
    await expect(como(db, DUENO_A, (tx) => tx.query(`select anular_seleccion($1, 'x')`, [sel.id])))
      .rejects.toThrow(/ya se cobró/);

    const r = await comprarA(cobre, "4", "30");
    await seleccionar(r.id, "1");
    expect(await saldoProv()).toBe(30);
    await expect(como(db, DUENO_A, (tx) => tx.query(`select registrar_devolucion_proveedor($1, $2, 31, $3)`, [empA, prov, caja])))
      .rejects.toThrow(/mayor al saldo/);
    const c0 = await saldoCaja();
    await como(db, DUENO_A, (tx) => tx.query(`select registrar_devolucion_proveedor($1, $2, 30, $3)`, [empA, prov, caja]));
    expect(await saldoCaja()).toBeCloseTo(c0 + 30, 2);
    expect(await saldoProv()).toBe(0);
  });

  it("anular una selección devuelve los kilos y el costo al stock; con descuento no se anula la compra antes", async () => {
    const r = await comprarA(cobre, "5", "30");
    await seleccionar(r.id, "2");
    await expect(como(db, DUENO_A, (tx) => tx.query(`select anular_compra($1, 'x')`, [r.id]))).rejects.toThrow(/Anule primero/);
    const s0 = await stock(cobre);
    const sel = await como(db, DUENO_A, (tx) => uno<{ id: string }>(tx, `select id from selecciones_compra where compra_id = $1`, [r.id]));
    await como(db, DUENO_A, (tx) => tx.query(`select anular_seleccion($1, 'Error')`, [sel.id]));
    const s1 = await stock(cobre);
    expect(num(s1.kg)).toBeCloseTo(num(s0.kg) + 2, 3);
    expect(num(s1.costo_total)).toBeCloseTo(num(s0.costo_total) + 60, 2);
    await como(db, DUENO_A, (tx) => tx.query(`select anular_compra($1, 'Prueba')`, [r.id]));
  });

  it("descuento asumido (o sin proveedor) es merma y baja la utilidad", async () => {
    const r = await comprarA(cobre, "6", "30");
    const pc0 = await porCobrar();
    const m0 = await como(db, DUENO_A, (tx) => uno<{ m: string }>(tx,
      `select coalesce(sum(merma_ajustes), 0) m from v_resultado_mes where empresa_id = $1`, [empA])).then((x) => num(x.m));
    await seleccionar(r.id, "1", false, "Material contaminado");
    const m1 = await como(db, DUENO_A, (tx) => uno<{ m: string }>(tx,
      `select coalesce(sum(merma_ajustes), 0) m from v_resultado_mes where empresa_id = $1`, [empA])).then((x) => num(x.m));
    expect(m1).toBeCloseTo(m0 + 30, 2);
    expect(await porCobrar()).toBeCloseTo(pc0, 2);
  });

  it("lotes: muestran fecha de llegada, descuento y lo que queda en stock", async () => {
    const lotes = await como(db, DUENO_A, (tx) => tx.query<{ kg_ingresado: string; kg_en_stock: string; por_seleccionar: boolean }>(
      `select kg_ingresado, kg_en_stock, por_seleccionar from v_lotes where metal_id = $1`, [cobre]));
    const st = await stock(cobre);
    const enStock = lotes.rows.reduce((s, l) => s + num(l.kg_en_stock), 0);
    expect(enStock).toBeLessThanOrEqual(num(st.kg) + 0.001);
    expect(lotes.rows.some((l) => l.por_seleccionar)).toBe(true);
  });
});

describe("Ventas · peso recibido", () => {
  it("el comprador no puede recibir más de lo que salió (+2 % de tolerancia)", async () => {
    const v = await como(db, DUENO_A, (tx) =>
      uno<{ r: { id: string } }>(tx, `select registrar_venta($1, $2, $3::jsonb) as r`,
        [empA, comprador, JSON.stringify([{ metal_id: cobre, peso_salida_kg: "1.000" }])])).then((x) => x.r);
    const item = await como(db, DUENO_A, (tx) => uno<{ id: string }>(tx, `select id from venta_items where venta_id = $1`, [v.id]));
    await expect(como(db, DUENO_A, (tx) => tx.query(`select confirmar_venta($1, $2::jsonb, $3)`,
      [v.id, JSON.stringify([{ item_id: item.id, peso_recibido_kg: "5", precio_kg: "34" }]), caja]))).rejects.toThrow(/mayor a lo que salió/);
    await como(db, DUENO_A, (tx) => tx.query(`select confirmar_venta($1, $2::jsonb, $3)`,
      [v.id, JSON.stringify([{ item_id: item.id, peso_recibido_kg: "1.010", precio_kg: "34" }]), caja]));
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
    expect(num(r.p.ganancia_acumulada).toFixed(2)).toBe(num(r.res.s).toFixed(2));
  });

  it("la curva S (acumulado diario) termina en la misma utilidad que el resultado del rango", async () => {
    const r = await como(db, DUENO_A, async (tx) => ({
      serie: await uno<{ d: { dias: { utilidad_acum: number }[]; meses: { utilidad: number }[] } }>(tx,
        `select dashboard_serie($1, (now() at time zone 'America/Lima')::date - 40, (now() at time zone 'America/Lima')::date) d`, [empA]),
      rango: await uno<{ d: { utilidad: number } }>(tx,
        `select dashboard_rango($1, (now() at time zone 'America/Lima')::date - 40, (now() at time zone 'America/Lima')::date) d`, [empA]),
    }));
    expect(r.serie.d.dias).toHaveLength(41);
    expect(num(r.serie.d.dias.at(-1)!.utilidad_acum).toFixed(2)).toBe(num(r.rango.d.utilidad).toFixed(2));
    const sumaMeses = r.serie.d.meses.reduce((s, m) => s + num(m.utilidad), 0);
    expect(sumaMeses.toFixed(2)).toBe(num(r.rango.d.utilidad).toFixed(2));
  });
});
