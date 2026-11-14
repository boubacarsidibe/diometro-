import { createBrowserClient } from "@supabase/ssr";
import { REMEMBER_COOKIE, sessionScoped } from "@/lib/supabase/remember";

// Cookies gérés ici (et non par défaut) pour respecter « Rester connecté » décoché :
// sans cela, le client du navigateur reposerait des cookies valables 400 jours (ex. après la vérification du code).
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase manquante");
  return createBrowserClient(url, key, {
    cookies: {
      getAll: () =>
        document.cookie.split("; ").filter(Boolean).map((c) => {
          const i = c.indexOf("=");
          return { name: decodeURIComponent(c.slice(0, i)), value: decodeURIComponent(c.slice(i + 1)) };
        }),
      setAll(list) {
        const persist = !new RegExp(`(?:^|; )${REMEMBER_COOKIE}=0(?:;|$)`).test(document.cookie);
        for (const { name, value, options } of list) {
          const o = (sessionScoped(options, persist) ?? {}) as { path?: string; maxAge?: number; expires?: Date; sameSite?: string | boolean; domain?: string; secure?: boolean };
          let s = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=${o.path ?? "/"}`;
          if (o.maxAge !== undefined) s += `; Max-Age=${o.maxAge}`;
          if (o.expires) s += `; Expires=${new Date(o.expires).toUTCString()}`;
          if (typeof o.sameSite === "string") s += `; SameSite=${o.sameSite}`;
          if (o.domain) s += `; Domain=${o.domain}`;
          if (o.secure || location.protocol === "https:") s += "; Secure";
          document.cookie = s;
        }
      },
    },
  });
}
