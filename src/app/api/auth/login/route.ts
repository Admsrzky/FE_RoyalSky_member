import { NextResponse } from "next/server";

import { ApiError, upstream } from "@/lib/api";
import { authCookies } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginPayload = {
  token?: string;
  user?: Record<string, unknown>;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function failure(message: string, status: number) {
  return NextResponse.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("Permintaan login tidak valid.", 400);
  }

  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const identifier = readString(record.identifier);
  const pin = readString(record.pin).replace(/\s+/g, "");

  if (!identifier) {
    return failure("Masukkan email atau ID akun Anda.", 422);
  }
  if (!/^\d{4,6}$/.test(pin)) {
    return failure("PIN harus terdiri dari 4–6 digit.", 422);
  }

  const numericId = /^\d+$/.test(identifier) ? Number(identifier) : null;
  const loginBody =
    numericId !== null && numericId > 0
      ? { user_id: numericId, pin }
      : { identifier, pin };

  try {
    const data = await upstream<LoginPayload>("/auth/login", {
      method: "POST",
      body: loginBody,
    });

    const token = readString(data?.token);
    const rawUser = data?.user ?? {};
    const id = Number(rawUser.id);
    const name = readString(rawUser.name);
    const roles = readList(rawUser.roles);

    if (!token || !Number.isFinite(id) || id <= 0) {
      return failure("Respons login dari server tidak lengkap.", 502);
    }

    if (!roles.some((role) => role.toLowerCase() === "member")) {
      return failure(
        "Portal ini khusus akun member. Untuk akun staf, gunakan aplikasi kasir Royal Sky.",
        403,
      );
    }

    const user: SessionUser = {
      id,
      name: name || "Member Royal Sky",
      email: readString(rawUser.email),
      phone: readString(rawUser.phone),
      homeBranchId: Number(rawUser.home_branch_id) || 0,
      roles,
      posAreas: readList(rawUser.pos_areas),
      permissions: readList(rawUser.permissions),
      createdAt: readString(rawUser.created_at),
    };

    const response = NextResponse.json(
      {
        ok: true,
        user: { id: user.id, name: user.name, email: user.email },
      },
      { headers: { "Cache-Control": "no-store" } },
    );

    for (const cookie of authCookies({ token, user })) {
      response.cookies.set(cookie);
    }

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return failure(
          "Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.",
          429,
        );
      }
      if (error.status === 422) {
        return failure("Email/ID atau PIN tidak sesuai.", 422);
      }
      if (error.status === 0) return failure(error.message, 503);
      return failure(
        error.message || "Login belum bisa diproses. Coba lagi.",
        error.status >= 400 && error.status < 600 ? error.status : 502,
      );
    }

    console.error("[login] unexpected error", error);
    return failure("Login belum bisa diproses. Coba lagi beberapa saat.", 500);
  }
}
