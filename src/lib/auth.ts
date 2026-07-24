import "server-only";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "dha_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET manquante ou trop courte. Générez une valeur avec " +
        "`openssl rand -base64 32` et mettez-la dans .env.local."
    );
  }
  return new TextEncoder().encode(secret);
}

/** Crée un JWT de session signé, à poser dans un cookie httpOnly. */
export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "dashboard_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

/** Vérifie un JWT de session. Renvoie true si valide, false sinon. */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_DURATION_SECONDS;
