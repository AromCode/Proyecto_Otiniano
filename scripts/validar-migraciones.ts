// pnpm db:validar → aplica todas las migraciones en PGlite y reporta errores de SQL
import { crearDb } from "../tests/db/harness";

crearDb()
  .then(() => console.log("✔ Migraciones válidas"))
  .catch((e) => {
    console.error("✘", e.message);
    process.exit(1);
  });
