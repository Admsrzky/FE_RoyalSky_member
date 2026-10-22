import { ApiError } from "./api";
import { buildMemberCard, findMemberRow } from "./member";
import { getServiceSession, serviceRequest } from "./service";
import type { SessionUser } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function positiveId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Resolves an e-mail, member code, or numeric member id with the server-side
 * service account. Used by the PIN login lookup and the temporary PIN-less
 * mode; the service token never leaves the server.
 */
async function resolveMemberRecord(identifier: string): Promise<{
  raw: unknown;
  service: Awaited<ReturnType<typeof getServiceSession>>;
}> {
  const service = await getServiceSession();
  const needle = identifier.trim();
  const branchId = service.user.homeBranchId || 1;
  const numericId = /^\d+$/.test(needle) ? Number(needle) : null;

  let raw: unknown = null;

  if (numericId !== null && numericId > 0) {
    try {
      raw = await serviceRequest<unknown>(`/members/${numericId}`, { branchId });
    } catch (error) {
      const canSearch =
        error instanceof ApiError &&
        (error.status === 403 || error.status === 404);
      if (!canSearch) throw error;
    }
  }

  if (raw === null) {
    const result = await serviceRequest<unknown>(
      `/members?q=${encodeURIComponent(needle)}&per_page=10`,
      { branchId },
    );
    raw = findMemberRow(result, needle);
  }

  if (!raw) {
    throw new ApiError(
      "Member tidak ditemukan. Periksa email atau ID member Anda.",
      404,
    );
  }

  return { raw, service };
}

/**
 * Returns the numeric member id used by the upstream login endpoint. The live
 * API rejects e-mail/identifier login for member accounts, but accepts the same
 * credentials when sent as `user_id`.
 */
export async function resolveMemberId(identifier: string): Promise<number> {
  const { raw } = await resolveMemberRecord(identifier);
  const row = isRecord(raw) ? raw : {};
  const card = buildMemberCard(raw);
  const id =
    positiveId(row.user_id) ??
    positiveId(row.auth_user_id) ??
    positiveId(row.account_id) ??
    positiveId(card.id);

  if (id === null) {
    throw new ApiError("Data member dari server tidak lengkap.", 502);
  }
  return id;
}

export async function resolvePinlessMember(
  identifier: string,
): Promise<SessionUser> {
  const { raw, service } = await resolveMemberRecord(identifier);
  const card = buildMemberCard(raw);
  const id = Number(card.id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ApiError("Data member dari server tidak lengkap.", 502);
  }

  const row = isRecord(raw) ? raw : {};
  const homeBranchId =
    Number(row.home_branch_id) || service.user.homeBranchId || 1;

  return {
    id,
    name: card.name || "Member Royal Sky",
    email: card.email || textOf(row.email),
    phone: card.phone || textOf(row.phone),
    homeBranchId,
    roles: ["member"],
    posAreas: [],
    permissions: [],
    createdAt: card.joinedAt,
    access: "pinless",
  };
}
