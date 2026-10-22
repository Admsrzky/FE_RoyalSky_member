import { NextResponse } from "next/server";

import { ApiError } from "./api";

export function memberErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const status =
      error.status >= 400 && error.status < 600 ? error.status : 502;
    return NextResponse.json(
      { ok: false, message: error.message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("[member] unexpected error", error);
  return NextResponse.json(
    {
      ok: false,
      message: "Data member belum bisa dimuat. Coba lagi beberapa saat.",
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
