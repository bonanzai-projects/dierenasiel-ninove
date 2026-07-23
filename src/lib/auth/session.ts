import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dierenasiel-ninove-dev-secret-change-in-prod"
);

const SESSION_COOKIE = "session";
const GUEST_COOKIE = "guest-mode";

/**
 * Sessieduur. In productie bewust kort (7 dagen): een backoffice-sessie die
 * blijft leven op een gedeeld of verloren toestel is een reëel risico.
 * Lokaal (dev) is dat risico er niet en is telkens opnieuw inloggen enkel
 * hinderlijk tijdens het testen → 30 dagen.
 */
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const SESSION_DURATION = IS_PRODUCTION
  ? 7 * 24 * 60 * 60 // 7 dagen
  : 30 * 24 * 60 * 60; // 30 dagen

/**
 * Schuivend venster: het token wordt vernieuwd zodra er minder dan deze tijd
 * rest. In productie pas op de laatste dag; lokaal zodra de sessie een dag oud
 * is, zodat elke werkdag de volle 30 dagen weer ingaat en je in de praktijk
 * ingelogd blijft zolang je het project minstens maandelijks opent.
 */
const REFRESH_THRESHOLD = IS_PRODUCTION
  ? 24 * 60 * 60
  : SESSION_DURATION - 24 * 60 * 60;

export interface SessionPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(SECRET);
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function refreshSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const session = payload as unknown as SessionPayload & { exp?: number };

    // Sliding window: re-issue token if less than REFRESH_THRESHOLD remaining
    const now = Math.floor(Date.now() / 1000);
    if (session.exp && session.exp - now < REFRESH_THRESHOLD) {
      const newToken = await createSession({
        userId: session.userId,
        email: session.email,
        role: session.role,
        name: session.name,
      });
      await setSessionCookie(newToken);
    }

    return {
      userId: session.userId,
      email: session.email,
      role: session.role,
      name: session.name,
    };
  } catch {
    return null;
  }
}

export async function setGuestCookie() {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_COOKIE, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(GUEST_COOKIE);
}

export function hasAuthCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return (
    cookieHeader.includes(`${SESSION_COOKIE}=`) ||
    cookieHeader.includes(`${GUEST_COOKIE}=`)
  );
}
