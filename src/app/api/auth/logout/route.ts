import { NextResponse, type NextRequest } from "next/server";

import { upstream } from "@/lib/api";
import { clearedAuthCookies, getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function revokeToken() {
  const session = await getSession();
  if (!session) return;
  try {
    await upstream("/auth/logout", {
      method: "POST",
      token: session.token,
      branchId: session.user.homeBranchId,
    });
  } catch {
    // The local cookies are cleared even when the upstream revocation fails.
  }
}

function withClearedCookies(response: NextResponse) {
  for (const cookie of clearedAuthCookies()) {
    response.cookies.set(cookie);
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST() {
  await revokeToken();
  return withClearedCookies(NextResponse.json({ ok: true }));
}

export async function GET(request: NextRequest) {
  await revokeToken();
  return withClearedCookies(NextResponse.redirect(new URL("/", request.url)));
}
