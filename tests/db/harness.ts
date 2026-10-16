// Carga las migraciones en un Postgres embebido (PGlite) con stubs mínimos de Supabase
// (roles, auth.uid(), storage) para probar la lógica de negocio sin Docker ni red.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to public;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema public, storage to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
`;

export type Db = PGlite;

export async function crearDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(STUBS);
  const dir = join(process.cwd(), "supabase", "migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(dir, f), "utf8"));
    } catch (e) {
      throw new Error(`Migración ${f}: ${(e as Error).message}`);
    }
  }
  return db;
}

/** Ejecuta fn como un usuario autenticado (RLS activa) dentro de una transacción. */
export async function como<T>(db: Db, userId: string, fn: (tx: Pick<Db, "query">) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await tx.query(`set local role authenticated`);
    return fn(tx);
  });
}

export async function uno<T = Record<string, unknown>>(
  tx: Pick<Db, "query">, sql: string, params: unknown[] = [],
): Promise<T> {
  const r = await tx.query<T>(sql, params);
  return r.rows[0];
}
