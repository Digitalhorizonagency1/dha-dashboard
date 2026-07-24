import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const COOKIE_NAME = "dha_session";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes toujours accessibles sans session
  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = await verifySessionToken(token);

  if (!valid) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Applique le proxy à tout sauf les fichiers statiques Next.js
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
