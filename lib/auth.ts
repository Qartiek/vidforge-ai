import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const secret = process.env.AUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production");
const key = new TextEncoder().encode(secret || "development-only-change-me");
const COOKIE = "vidforge_session";

export type SessionUser = { id: string; email: string; name?: string | null; role: "USER" | "ADMIN" };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ userId: user.id, email: user.email, role: user.role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 604800 });
}
export async function clearSession() { (await cookies()).delete(COOKIE); }
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    const user = await db.user.findUnique({ where: { id: payload.userId }, select: { id: true, email: true, name: true, role: true } });
    return user ?? null;
  } catch { return null; }
}
export async function requireAuth() { const user = await getSessionUser(); if (!user) throw new Error("UNAUTHORIZED"); return user; }
