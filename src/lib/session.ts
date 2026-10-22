import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import type { Session, SessionUser } from "./types";

export const TOKEN_COOKIE = "rs_member_token";
export const USER_COOKIE = "rs_member_user";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const DEV_SECRET = "royale-sky-local-session-secret-do-not-use-in-production";

export type CookieDefinition = {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function configuredSecret(): string | null {
  const value = process.env.ROYALE_SESSION_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

/**
 * Pinless sessions authorize server-side data access, so the cookie must not be
 * forgeable. Production requires a real secret; local development has a stable
 * fallback so restarting the dev server does not log everyone out.
 */
export function sessionSecretReady(): boolean {
  return configuredSecret() !== null || !isProduction();
}

function sessionSecret(): string {
  const secret = configuredSecret();
  if (secret) return secret;
  if (isProduction()) {
    throw new Error(
      "ROYALE_SESSION_SECRET minimal 32 karakter wajib diisi di production.",
    );
  }
  return DEV_SECRET;
}

function signatureFor(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function encodeUser(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  return `${payload}.${signatureFor(payload)}`;
}

function decodeUser(value: string): SessionUser | null {
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = signatureFor(payload);
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SessionUser>;
    if (!parsed || typeof parsed.id !== "number" || !parsed.name) return null;
    const access = parsed.access === "pinless" ? "pinless" : "pin";
    return {
      id: parsed.id,
      name: String(parsed.name),
      email: String(parsed.email ?? ""),
      phone: String(parsed.phone ?? ""),
      homeBranchId: Number(parsed.homeBranchId ?? 0) || 0,
      roles: Array.isArray(parsed.roles) ? parsed.roles.map(String) : [],
      posAreas: Array.isArray(parsed.posAreas) ? parsed.posAreas.map(String) : [],
      permissions: Array.isArray(parsed.permissions)
        ? parsed.permissions.map(String)
        : [],
      createdAt: String(parsed.createdAt ?? ""),
      access,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const rawUser = store.get(USER_COOKIE)?.value;
  if (!rawUser) return null;

  const user = decodeUser(rawUser);
  if (!user) return null;

  if (user.access === "pinless") {
    return { token: "", user };
  }

  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return { token, user };
}

export function authCookies(session: Session): CookieDefinition[] {
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
  };

  const cookies: CookieDefinition[] = [
    {
      name: TOKEN_COOKIE,
      value: session.token,
      ...base,
      maxAge: session.token ? MAX_AGE_SECONDS : 0,
    },
    {
      name: USER_COOKIE,
      value: encodeUser(session.user),
      ...base,
      maxAge: MAX_AGE_SECONDS,
    },
  ];
  return cookies;
}

export function clearedAuthCookies(): CookieDefinition[] {
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge: 0,
  };

  return [
    { name: TOKEN_COOKIE, value: "", ...base },
    { name: USER_COOKIE, value: "", ...base },
  ];
}
