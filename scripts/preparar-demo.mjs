// pnpm demo:preparar · Prepara la empresa demo para que el cliente la recorra en el build de producción (3001):
// un usuario por rol (cada corrida les pone clave nueva en credenciales-demo.txt) y productos de ejemplo sin duplicar.
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local", quiet: true });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const chk = (r, msg) => { if (r.error) throw new Error(`${msg}: ${r.error.message}`); return r.data; };

const emp = chk(await sb.from("empresas").select("id").eq("razon_social", "Sistema Otiniano").single(), "empresa");

// --- Usuarios por rol ---
const usuarios = [
  { email: "gerencia.demo@metales.local", nombre: "Sr. Otiniano (Gerencia)", rol: "dueno" },
  { email: "administracion.demo@metales.local", nombre: "Administración Demo", rol: "administrador" },
  { email: "almacen.demo@metales.local", nombre: "Almacén Demo", rol: "cajero" },
];
const { data: lista } = await sb.auth.admin.listUsers({ perPage: 1000 });
const lineas = ["Sistema Otiniano · accesos de prueba para el cliente (empresa demo)", ""];
for (const u of usuarios) {
  const clave = `Oti-${randomBytes(4).toString("hex")}`;
  let id = lista.users.find((x) => x.email === u.email)?.id;
  if (id) chk(await sb.auth.admin.updateUserById(id, { password: clave }), "clave");
  else id = chk(await sb.auth.admin.createUser({ email: u.email, password: clave, email_confirm: true, user_metadata: { nombre: u.nombre } }), "usuario").user.id;
  chk(await sb.rpc("admin_agregar_miembro", { p_empresa: emp.id, p_user: id, p_rol: u.rol, p_nombre: u.nombre, p_email: u.email }), "miembro");
  lineas.push(`${u.nombre.padEnd(26)} ${u.email.padEnd(36)} ${clave}`);
}

// --- Jerarquía de ejemplo: familias con código y precio mayorista, variantes con precio propio ---
const productos = chk(await sb.from("metales").select("id, nombre, padre_id").eq("empresa_id", emp.id), "productos");
const familia = (n) => productos.find((p) => p.nombre === n && !p.padre_id);
const familias = { Cobre: ["CU", 30.5], Bronce: ["BR", 20.5], Aluminio: ["AL", 4.8], Fierro: ["FE", 0.9] };
for (const [nombre, [codigo, mayorista]] of Object.entries(familias)) {
  const f = familia(nombre);
  if (f) chk(await sb.from("metales").update({ codigo, precio_mayorista: mayorista }).eq("id", f.id), "familia");
}
const variantes = [
  ["Cobre", "Brillante", "CU-BR", 32, 32.5, 36.5],
  ["Cobre", "Quemado", "CU-QM", 28, 28.5, 32],
  ["Cobre", "Cable con forro", "CU-CF", 14, 14.5, 17],
  ["Aluminio", "Perfil", "AL-PE", 5.2, 5.5, 6.4],
  ["Aluminio", "Olla", "AL-OL", 4.5, 4.8, 5.6],
  ["Aluminio", "Lata", "AL-LA", 3.5, 3.8, 4.4],
  ["Fierro", "Chatarra pesada", "FE-PE", 0.9, 1, 1.15],
  ["Fierro", "Chatarra liviana", "FE-LI", 0.7, 0.8, 0.95],
];
for (const [padre, nombre, codigo, compra, mayorista, venta] of variantes) {
  const f = familia(padre);
  if (!f || productos.some((p) => p.padre_id === f.id && p.nombre === nombre)) continue;
  chk(await sb.from("metales").insert({ empresa_id: emp.id, padre_id: f.id, nombre, codigo, precio_compra: compra,
    precio_mayorista: mayorista, precio_venta: venta, color: null }), `variante ${nombre}`);
}
// Variante de una variante (niveles libres)
const perfil = chk(await sb.from("metales").select("id").eq("empresa_id", emp.id).eq("codigo", "AL-PE").single(), "perfil");
const yaSucio = chk(await sb.from("metales").select("id").eq("padre_id", perfil.id).eq("nombre", "Perfil sucio"), "sucio");
if (!yaSucio.length) chk(await sb.from("metales").insert({ empresa_id: emp.id, padre_id: perfil.id, nombre: "Perfil sucio", codigo: "AL-PE-S",
  precio_compra: 4.6, precio_mayorista: 4.9, precio_venta: 5.8 }), "perfil sucio");

// Un proveedor con RUC queda como mayorista (otro almacén de reciclaje)
const prov = chk(await sb.from("proveedores").select("id, nombre").eq("empresa_id", emp.id).eq("tipo_doc", "RUC").limit(1), "prov");
if (prov[0]) chk(await sb.from("proveedores").update({ clase: "mayorista" }).eq("id", prov[0].id), "mayorista");

lineas.push("", "Abrir: http://localhost:3001 (o la URL de producción cuando se publique).",
  prov[0] ? `Proveedor mayorista de ejemplo: ${prov[0].nombre}` : "");
writeFileSync("credenciales-demo.txt", lineas.join("\n") + "\n");
console.log("ok");
