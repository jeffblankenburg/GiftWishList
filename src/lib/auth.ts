import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-change-in-production"
);

const COOKIE_NAME = "auth-token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  phoneNumber: string;
  displayName: string;
}

export async function createSession(userId: string): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If it starts with 1 and has 11 digits, it's US format
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // If it has 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Otherwise, assume it already has country code
  return `+${digits}`;
}

export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Basic validation: starts with + and has 10-15 digits
  return /^\+\d{10,15}$/.test(formatted);
}
