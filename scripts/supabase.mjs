// Ejecuta la CLI de Supabase cargando las credenciales de .env.local
// (SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD). Uso: pnpm sb <comando...>
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config } from "dotenv";

if (existsSync(".env.local")) config({ path: ".env.local", quiet: true });

const r = spawnSync("pnpm", ["exec", "supabase", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});
process.exit(r.status ?? 1);
