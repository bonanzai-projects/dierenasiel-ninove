import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/login",
  // Wie zijn wachtwoord kwijt is of een uitnodiging kreeg, is per definitie
  // niet ingelogd — deze twee moeten dus vóór de sessiecheck door.
  "/wachtwoord-vergeten",
  "/wachtwoord-instellen",
  "/api",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/wandelaar-registratie",
  "/adoptie-aanvraag",
];

// All roles with access to /beheerder routes (defined locally — Edge Runtime safe)
const BACKOFFICE_ROLES = [
  "beheerder",
  "medewerker",
  "dierenarts",
  "adoptieconsulent",
  "coördinator",
];

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dierenasiel-ninove-dev-secret-change-in-prod"
);

async function getSessionRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  // Protected platform routes — beheerder (all 5 backoffice roles)
  if (pathname.startsWith("/beheerder")) {
    const role = await getSessionRole(request);
    if (!role || !BACKOFFICE_ROLES.includes(role)) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/wandelaar")) {
    const role = await getSessionRole(request);
    if (role !== "wandelaar" && role !== "beheerder") {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Default: check for session or guest cookie (surfer routes)
  const hasSession = request.cookies.has("session");
  const hasGuest = request.cookies.has("guest-mode");

  if (!hasSession && !hasGuest) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
