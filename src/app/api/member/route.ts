import { NextResponse } from "next/server";

import { loadMemberData } from "@/lib/member";
import { memberErrorResponse } from "@/lib/http";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sesi Anda telah berakhir. Silakan masuk kembali." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
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
