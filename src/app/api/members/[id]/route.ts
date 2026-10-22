import { NextResponse } from "next/server";

import { memberErrorResponse } from "@/lib/http";
import { loadMemberData } from "@/lib/member";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Self-scoped member detail. The BFF never accepts an arbitrary id from the
 * browser: the requested id must belong to the signed-in member.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sesi Anda telah berakhir. Silakan masuk kembali." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id } = await context.params;
  if (String(session.user.id) !== id) {
    return NextResponse.json(
      { ok: false, message: "Anda hanya dapat membuka kartu member Anda sendiri." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const member = await loadMemberData(session);
    return NextResponse.json(
      { ok: true, member },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return memberErrorResponse(error);
  }
}
