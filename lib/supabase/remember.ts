// Choix « Rester connecté » mémorisé dans ce cookie : "0" = ordinateur partagé, la session s'arrête
// à la fermeture du navigateur (cookies sans date d'expiration). Sans ce cookie : session conservée (comportement d'avant).
// Lisible par le navigateur (pas httpOnly) : le client Supabase du navigateur doit aussi l'appliquer. Il ne contient rien de secret.
export const REMEMBER_COOKIE = "dm_remember";

type Opts = { maxAge?: number; expires?: Date | number | string } & Record<string, unknown>;

export function sessionScoped<T extends Opts | undefined>(options: T, persist: boolean): T {
  if (persist || !options) return options;
  // Une suppression de cookie (maxAge 0 ou date passée) doit rester une suppression.
  const exp = options.expires === undefined ? null : new Date(options.expires).getTime();
  if (options.maxAge !== undefined && options.maxAge <= 0) return options;
  if (exp !== null && exp <= Date.now()) return options;
  const rest: Record<string, unknown> = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest as T;
}
