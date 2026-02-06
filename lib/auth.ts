import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export type AuthUser = {
  id: number;
  name?: string | null;
  phone?: string | null;
  role?: string | null;
  isAdmin?: boolean | null;
};

type AuthTokenPayload = {
  userId: number | string;
  phone?: string;
  role?: string;
  isAdmin?: boolean;
  name?: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = cookies().get("auth_token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    const { payload } = await jwtVerify(token, secret);
    const decoded = payload as unknown as AuthTokenPayload;

    const id = Number(decoded.userId);
    if (Number.isNaN(id)) return null;
    return {
      id,
      name: decoded.name ?? null,
      phone: decoded.phone ?? null,
      role: decoded.role ?? null,
      isAdmin: decoded.isAdmin ?? null
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
