import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for server-side functions.
 * Uses Next.js server-side cookies for auth.
 * Note: In Next.js 15+, cookies() is async.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies(); // <-- async in Next.js 15+

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value ?? null;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, {
            ...options,
            path: "/",
            sameSite: "lax",
          });
        },
        remove(name: string) {
          cookieStore.set(name, "", {
            path: "/",
            maxAge: -1,
            sameSite: "lax",
          });
        }
      }
    }
  );
}
