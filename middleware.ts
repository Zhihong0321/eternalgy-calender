import { NextResponse, type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const AUTH_URL = "https://auth.atap.solar";

function getReturnTo(request: NextRequest) {
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
