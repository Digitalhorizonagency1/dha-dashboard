import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";

// Anti-bruteforce très simple, en mémoire (suffisant pour un usage mono-
// utilisateur ; si le dashboard grandit, remplacer par un rate-limit côté
// edge/KV persistant, car ceci se réinitialise à chaque redéploiement/cold start).
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const clientKey = getClientKey(request);
  const now = Date.now();
  const entry = attempts.get(clientKey);

  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;

  const expectedPassword = process.env.DASHBOARD_PASSWORD;
  if (!expectedPassword) {
    return NextResponse.json(
      { error: "DASHBOARD_PASSWORD non configuré côté serveur." },
      { status: 500 }
    );
  }

  if (typeof password !== "string" || password !== expectedPassword) {
    const nextCount = entry && entry.resetAt > now ? entry.count + 1 : 1;
    attempts.set(clientKey, { count: nextCount, resetAt: now + WINDOW_MS });
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  attempts.delete(clientKey);

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
