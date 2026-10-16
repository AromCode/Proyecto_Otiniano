// Acceso directo SOLO EN DESARROLLO. DEV_LOGIN_EMAIL es el usuario principal; DEV_LOGIN_EMAILS (opcional,
// separados por coma) agrega usuarios de prueba para revisar otros roles (cajero, balancero…).
export function correosDev(): string[] {
  if (process.env.NODE_ENV !== "development") return [];
  return [process.env.DEV_LOGIN_EMAIL, ...(process.env.DEV_LOGIN_EMAILS ?? "").split(",")]
    .map((e) => e?.trim().toLowerCase()).filter((e): e is string => !!e);
}
