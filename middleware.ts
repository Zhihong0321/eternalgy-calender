import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_URL = "https://auth.atap.solar";

function getReturnTo(request: NextRequest) {
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  // Try to find the real public URL
  let publicUrl = "";

  // 1. Check Env
  let appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)?.trim();
  if (appUrl) {
    if (!appUrl.startsWith("http")) appUrl = `https://${appUrl}`;
    try {
      publicUrl = new URL(pathname + search, appUrl).toString();
    } catch { }
  }

  // 2. If no env or invalid, use headers
  if (!publicUrl && host && !host.includes("localhost")) {
    publicUrl = `${protocol}://${host}${pathname}${search}`;
  }

  // 3. Fallback
  if (!publicUrl) {
    publicUrl = request.nextUrl.href;
  }

  // Final emergency check: if it still says localhost, and we have ANY host header, use it
  if (publicUrl.includes("localhost") && host && !host.includes("localhost")) {
    publicUrl = publicUrl.replace(/https?:\/\/localhost(:\d+)?/, `${protocol}://${host}`);
  }

  return encodeURIComponent(publicUrl);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    const returnTo = getReturnTo(request);
    return NextResponse.redirect(`${AUTH_URL}/?return_to=${returnTo}`);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const returnTo = getReturnTo(request);
    return NextResponse.redirect(`${AUTH_URL}/?return_to=${returnTo}`);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
