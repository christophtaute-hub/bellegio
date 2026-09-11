import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";

const PUBLIC_PATHS = ["/", "/login", "/impressum", "/datenschutz"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const hasActiveEinrichtung = Boolean(
    request.cookies.get(ACTIVE_EINRICHTUNG_COOKIE)?.value
  );

  if (
    user &&
    !hasActiveEinrichtung &&
    pathname !== "/einrichtung-auswahl" &&
    !isPublicPath
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/einrichtung-auswahl";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: any new response created after this point must copy the
  // cookies from `supabaseResponse` above, or the auth session will be lost.
  return supabaseResponse;
}
