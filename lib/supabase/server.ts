import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import { REMEMBER_COOKIE, sessionScoped } from "@/lib/supabase/remember";

export { REMEMBER_COOKIE };
export { LAST_EMAIL_COOKIE } from "@/lib/supabase/remember";

export async function createClient(opts: { persist?: boolean } = {}) {
  const store = await cookies();
  const persist = opts.persist ?? store.get(REMEMBER_COOKIE)?.value !== "0";
  const { url, key } = publicEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, sessionScoped(options, persist)));
        } catch {
          // Appelé depuis un Server Component : le proxy rafraîchit déjà la session.
        }
      },
    },
  });
}
