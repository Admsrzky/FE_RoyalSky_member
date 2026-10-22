import { cookies } from "next/headers";

import type { Session, SessionUser } from "./types";

export const TOKEN_COOKIE = "rs_member_token";
export const USER_COOKIE = "rs_member_user";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

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

export function encodeUser(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

function decodeUser(value: string): SessionUser | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as SessionUser;
    if (!parsed || typeof parsed.id !== "number" || !parsed.name) return null;
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
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  const rawUser = store.get(USER_COOKIE)?.value;
  if (!token || !rawUser) return null;

  const user = decodeUser(rawUser);
  if (!user) return null;
  return { token, user };
}

export function authCookies(session: Session): CookieDefinition[] {
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
  };

  return [
    {
      name: TOKEN_COOKIE,
      value: session.token,
      ...base,
      maxAge: MAX_AGE_SECONDS,
    },
    {
      name: USER_COOKIE,
      value: encodeUser(session.user),
      ...base,
      maxAge: MAX_AGE_SECONDS,
    },
  ];
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
