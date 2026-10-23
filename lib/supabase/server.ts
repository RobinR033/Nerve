import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookies kunnen hier niet worden gezet
          }
        },
      },
    }
  );
}

export type AuthUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
};

/**
 * Ingelogde gebruiker voor Server Components. getClaims() controleert het
 * JWT lokaal (snel) i.p.v. bij elke paginaweergave een rondje naar Supabase
 * zoals getUser(). cache() deelt het resultaat tussen layout en pagina.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
  };
});
