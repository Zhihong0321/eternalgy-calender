import { NextResponse, type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const AUTH_URL = "https://auth.atap.solar";

function getReturnTo(request: NextRequest) {
  // 1. Try environment variable first
  let baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)?.trim();

  if (baseUrl) {
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }
    baseUrl = baseUrl.replace(/\/$/, "");
    return encodeURIComponent(baseUrl + request.nextUrl.pathname + request.nextUrl.search);
  }

  // 2. Try forwarded headers (standard for proxies like Railway)
  const xForwardedHost = request.headers.get("x-forwarded-host");
  const xForwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (xForwardedHost && !xForwardedHost.includes("localhost")) {
    return encodeURIComponent(`${xForwardedProto}://${xForwardedHost}${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  // 3. Last fallback: reconstruct from Host header but prefer https
  const host = request.headers.get("host");
  if (host && !host.includes("localhost")) {
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    return encodeURIComponent(`${protocol}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  // Final fallback to request.nextUrl.href, but replace localhost if found
  let href = request.nextUrl.href;
  if (href.includes("localhost:8080") && xForwardedHost) {
    href = href.replace("localhost:8080", xForwardedHost);
  }

  return encodeURIComponent(href);
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
