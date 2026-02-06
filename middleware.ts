import { NextResponse, type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const AUTH_URL = "https://auth.atap.solar";

function getReturnTo(request: NextRequest) {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (baseUrl) {
    // If protocol is missing, prepend https://
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }
    // Remove trailing slash if present to avoid double slashes
    baseUrl = baseUrl.replace(/\/$/, "");
    return encodeURIComponent(baseUrl + request.nextUrl.pathname + request.nextUrl.search);
  }

  // Use headers to reconstruct the URL as seen by the user (fallback)
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "http";

  if (host) {
    return encodeURIComponent(`${protocol}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  return encodeURIComponent(request.nextUrl.href);
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    const returnTo = getReturnTo(request);
    return NextResponse.redirect(`${AUTH_URL}/?return_to=${returnTo}`);
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET ?? "");
    return NextResponse.next();
  } catch {
    const returnTo = getReturnTo(request);
    return NextResponse.redirect(`${AUTH_URL}/?return_to=${returnTo}`);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
