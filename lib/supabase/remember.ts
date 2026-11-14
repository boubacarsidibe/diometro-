// Choix « Rester connecté » mémorisé dans ce cookie : "0" = ordinateur partagé, la session s'arrête
// à la fermeture du navigateur (cookies sans date d'expiration). Sans ce cookie : session conservée (comportement d'avant).
export const REMEMBER_COOKIE = "dm_remember";

export function sessionScoped<T extends object | undefined>(options: T, persist: boolean): T {
  if (persist || !options) return options;
  const rest: Record<string, unknown> = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest as T;
}
