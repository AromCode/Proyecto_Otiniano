// Marca en sessionStorage de que esta pestaña entró por el login (ver app/(app)/layout.tsx).
export const CLAVE_PESTANA = "otiniano:pestana";

/** Se llama al terminar de ingresar (pantalla de bienvenida) */
export function marcarPestana() {
  try {
    sessionStorage.setItem(CLAVE_PESTANA, "1");
  } catch {
    /* sin sessionStorage: el guardia tampoco puede leerlo y no bloquea */
  }
}
