import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "./db";

export type AuthUser = {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  isAdmin?: boolean | null;
  bubble_id?: string | null;
  profile_picture?: string | null;
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

    // Fetch full user data from Postgres
    const dbUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!dbUser) {
      // Fallback to token data if user not found in DB yet
      return {
        id,
        name: decoded.name ?? null,
        phone: decoded.phone ?? null,
        role: decoded.role ?? null,
        isAdmin: decoded.isAdmin ?? null
      };
    }

    return {
      id: dbUser.id,
      name: dbUser.email?.split("@")[0] || decoded.name || null, // Fallback name logic
      email: dbUser.email,
      phone: decoded.phone ?? null,
      role: decoded.role ?? null,
      isAdmin: decoded.isAdmin ?? null,
      bubble_id: dbUser.bubble_id,
      profile_picture: dbUser.profile_picture
    };
  } catch (err) {
    console.error("Auth error:", err);
    return null;
  }
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
