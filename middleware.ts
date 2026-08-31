import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { NO_TRACK_COOKIE } from "./lib/studio-tracking-cookie";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/studio${pathname.slice("/admin".length)}`;
    return NextResponse.redirect(redirectUrl);
  }
  const isLogin = pathname === "/studio/login";
  const isAuthHandoff = isLogin || pathname === "/studio/set-password";

  if (!url || !anonKey) {
    if (!isAuthHandoff) return NextResponse.redirect(new URL("/studio/login", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isAuthHandoff) return NextResponse.redirect(new URL("/studio/login", request.url));
  if (user && isLogin) return NextResponse.redirect(new URL("/studio", request.url));
  if (user && !request.cookies.get("cf_track_opt_in")) {
    response.cookies.set("cf_no_track", "1", NO_TRACK_COOKIE);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/studio/:path*"],
};
