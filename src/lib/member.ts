import { API_BASE_URL, ApiError, upstream } from "./api";
import { daysUntil, numberID, rupiah, shortDate } from "./format";
import { getServiceSession } from "./service";
import type {
  AttendanceInfo,
  GateCardInfo,
  MemberCardData,
  MembershipInfo,
  Session,
  SessionUser,
} from "./types";

type JsonRecord = Record<string, unknown>;

type CardSource = Omit<
  MemberCardData,
  | "statusLabel"
  | "tierBadge"
  | "nameUpper"
  | "cardNumber"
  | "expiryLabel"
  | "joinedLabel"
  | "walletLabel"
  | "pointsLabel"
  | "planDisplay"
  | "qrData"
  | "hasGateQr"
  | "isExpired"
  | "isFrozen"
  | "isActive"
  | "daysRemaining"
>;

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function firstDefined(
  row: JsonRecord,
  keys: string[],
): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function textOf(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(textOf).filter(Boolean).join(", ");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";
    return trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  return "";
}

function numOf(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw || raw === "—") return fallback;
    const direct = Number(raw);
    if (Number.isFinite(direct)) return direct;

    const cleaned = raw.replace(/[^\d,.-]/g, "");
    if (!cleaned) return fallback;
    const normalized = cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : /^\d{1,3}(\.\d{3})+$/.test(cleaned)
        ? cleaned.replace(/\./g, "")
        : cleaned;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function boolOf(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (["true", "1", "yes", "ya", "active", "aktif"].includes(raw)) return true;
    if (["false", "0", "no", "tidak", "inactive", "revoked"].includes(raw)) {
      return false;
    }
  }
  return fallback;
}

function arrayFrom(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key];
  }
  if (Array.isArray(record.data)) return record.data;
  return [];
}

function resolveStorageUrl(value: unknown): string | null {
  const raw = textOf(value);
  if (!raw) return null;
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  let origin = "https://api.mpdev.my.id";
  try {
    origin = new URL(API_BASE_URL).origin;
  } catch {
    // Keep the production origin fallback.
  }

  const path = raw.replace(/^\/+/, "");
  if (path.startsWith("storage/")) return `${origin}/${path}`;
  return `${origin}/storage/${path}`;
}

function normalizeStatus(value: unknown, expiresAt: string): string {
  const raw = textOf(value).toLowerCase();
  if (raw.includes("freeze") || raw.includes("beku")) return "frozen";
  if (raw.includes("expire") || raw.includes("kadaluarsa")) return "expired";
  if (raw.includes("pending")) return "pending";
  if (raw.includes("active") || raw.includes("aktif")) return "active";
  const left = expiresAt ? daysUntil(expiresAt) : null;
  if (left !== null && left < 0) return "expired";
  return "active";
}

function cleanPlan(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—" || trimmed.length > 32) {
    const alt = fallback.trim();
    if (!alt || alt === "—") return "Reguler";
    return alt;
  }
  return trimmed;
}

function cleanTier(value: string, plan: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—" || trimmed.length > 14) {
    return cleanPlan(plan, "Reguler");
  }
  return trimmed;
}

function finalizeCard(source: CardSource): MemberCardData {
  const statusRaw = source.status.toLowerCase();
  const isExpiredFlag =
    statusRaw.includes("expire") || statusRaw.includes("kadaluarsa");
  const holdDate = statusRaw.includes("freeze") || statusRaw.includes("pending");
  const days = source.expiresAt ? daysUntil(source.expiresAt) : null;
  const isExpired = isExpiredFlag || (!holdDate && days !== null && days < 0);
  const isFrozen = statusRaw.includes("freeze") || statusRaw.includes("beku");
  const isActive = !isExpired && !isFrozen;

  let tierBadge = "MEMBER";
  const tierRaw = source.tier.trim().toUpperCase();
  if (tierRaw.includes("VIP")) tierBadge = "VIP";
  else if (tierRaw.includes("PLATINUM")) tierBadge = "PLATINUM";
  else if (tierRaw.includes("GOLD")) tierBadge = "GOLD";
  else if (tierRaw.includes("SILVER")) tierBadge = "SILVER";
  else if (tierRaw.includes("REGULER") || tierRaw.includes("REGULAR")) {
    tierBadge = "REGULER";
  } else if (tierRaw && tierRaw !== "—" && tierRaw.length <= 14) {
    tierBadge = tierRaw;
  } else {
    const plan = source.planLabel.trim().toUpperCase();
    if (plan && plan !== "—" && plan.length <= 14) tierBadge = plan;
  }

  let statusLabel = "ACTIVE MEMBER";
  if (isExpired) statusLabel = "MEMBERSHIP EXPIRED";
  else if (isFrozen) statusLabel = "MEMBERSHIP FROZEN";
  else if (statusRaw.includes("pending")) statusLabel = "PENDING MEMBER";
  else {
    const combined = `${source.tier} ${source.planLabel}`.toUpperCase();
    if (combined.includes("VIP") || combined.includes("PLATINUM")) {
      statusLabel = "VIP ACTIVE MEMBER";
    }
  }

  const cardNumber =
    source.code.trim() && source.code.trim() !== "—"
      ? source.code.trim()
      : source.id;
  const planDisplay = source.planLabel.trim()
    ? source.planLabel.trim()
    : tierBadge;
  const qrData =
    source.gatePayload.trim() ||
    source.gateCode.trim() ||
    cardNumber;

  return {
    ...source,
    statusLabel,
    tierBadge,
    nameUpper: source.name.toUpperCase(),
    cardNumber,
    expiryLabel:
      !source.expiresAt || source.expiresAt === "—"
        ? "TANPA BATAS"
        : shortDate(source.expiresAt).toUpperCase(),
    joinedLabel: shortDate(source.joinedAt),
    walletLabel: rupiah(source.wallet),
    pointsLabel: `${numberID(source.points)} PTS`,
    planDisplay,
    qrData,
    hasGateQr: source.gateLoaded && source.gatePayload.trim().length > 0,
    isExpired,
    isFrozen,
    isActive,
    isLimited: source.isLimited,
    daysRemaining: days,
  };
}

/** Turns the payload of `GET /members/{id}` into the card view model. */
export function buildMemberCard(
  payload: unknown,
  extras: Partial<CardSource> = {},
): MemberCardData {
  const row = asRecord(payload);
  const membership = asRecord(row.membership);

  const packageName = textOf(
    firstDefined(membership, ["package_name", "name"]),
  );
  const membershipEnd = textOf(
    firstDefined(membership, [
      "end_date",
      "end_at",
      "expires_at",
      "valid_until",
    ]),
  );
  const expiresAt = textOf(
    firstDefined(row, [
      "expires_at",
      "expired_at",
      "end_at",
      "valid_until",
      "end_date",
    ]),
  ) || membershipEnd;
  const joinedAt = textOf(
    firstDefined(row, ["joined_at", "created_at", "start_at", "registered_at"]),
  ) || textOf(firstDefined(membership, ["start_date", "start_at"]));
  const rawStatus = textOf(
    firstDefined(membership, ["status"]) ??
      firstDefined(row, ["status", "membership_status"]),
  );
  const status = normalizeStatus(rawStatus, expiresAt);
  const planLabel = cleanPlan(
    textOf(
      firstDefined(row, [
        "plan_label",
        "membership_name",
        "plan",
        "package_name",
      ]),
    ) || packageName,
    packageName || textOf(firstDefined(row, ["tier"])),
  );
  const tier = cleanTier(
    textOf(firstDefined(row, ["tier", "membership_name", "tier_label"])) ||
      packageName,
    planLabel,
  );

  const sessionRemaining = numOf(
    firstDefined(membership, ["session_remaining", "pt_remaining"]),
  );
  const ptTotalRaw = numOf(
    firstDefined(row, ["pt_total", "pt_sessions", "total_sessions"]),
  );
  const ptUsedRaw = numOf(
    firstDefined(row, ["pt_used", "pt_sessions_used", "used_sessions"]),
  );
  const ptTotal = ptTotalRaw > 0 ? ptTotalRaw : sessionRemaining;
  const ptUsed = ptTotal > 0 ? Math.min(ptUsedRaw, ptTotal) : ptUsedRaw;

  const source: CardSource = {
    id: textOf(firstDefined(row, ["id", "member_id"])),
    name: textOf(firstDefined(row, ["name", "member_name", "full_name"])) || "Tanpa Nama",
    code: textOf(firstDefined(row, ["member_code", "code", "card_number"])),
    tier,
    planLabel,
    status,
    joinedAt,
    expiresAt,
    phone: textOf(firstDefined(row, ["phone", "phone_number", "whatsapp"])),
    email: textOf(firstDefined(row, ["email"])),
    facility:
      textOf(firstDefined(row, ["facility", "facilities", "access"])) || "Gym",
    wallet: numOf(
      firstDefined(row, ["wallet", "wallet_balance", "balance", "saldo"]),
    ),
    points: numOf(
      firstDefined(row, [
        "points",
        "points_balance",
        "loyalty_points",
        "point",
        "point_balance",
      ]),
    ),
    ptTotal,
    ptUsed,
    avatarUrl: resolveStorageUrl(
      firstDefined(row, [
        "avatar_url",
        "avatar",
        "photo_url",
        "image_url",
        "image_path",
      ]),
    ),
    gateCode: "",
    gatePayload: "",
    gateStatus: "",
    gateActive: false,
    gateLoaded: false,
    membershipId: textOf(firstDefined(membership, ["id"])),
    memberships: [],
    attendance: null,
    lastUsedAt: "",
    isLimited: false,
    ...extras,
  };

  return finalizeCard(source);
}

/** Finds a member row returned by the `GET /members?q=` lookup endpoint. */
export function findMemberRow(
  payload: unknown,
  identifier: string,
): JsonRecord | null {
  const needle = identifier.trim().toLowerCase();
  if (!needle) return null;

  const rows = arrayFrom(payload, ["items", "members", "data"]).map(asRecord);
  const match = rows.find((row) => {
    const candidates = [
      row.id,
      row.member_id,
      row.email,
      row.member_code,
      row.code,
      row.phone,
      row.phone_number,
    ]
      .map(textOf)
      .map((value) => value.toLowerCase());
    return candidates.includes(needle);
  });

  return match ?? null;
}

function normalizeGateCard(payload: unknown): GateCardInfo | null {
  const row = asRecord(payload);
  if (Object.keys(row).length === 0) return null;

  const status = textOf(firstDefined(row, ["status"])) || "active";
  const isRevoked = status.toLowerCase() === "revoked";
  const daysRaw = firstDefined(row, ["days_remaining"]);

  return {
    id: textOf(firstDefined(row, ["id"])),
    code: textOf(firstDefined(row, ["code"])),
    qrPayload: textOf(firstDefined(row, ["qr_payload"])),
    status,
    statusLabel: textOf(firstDefined(row, ["status_label"])) || "Aktif",
    isValid: boolOf(firstDefined(row, ["is_valid"]), !isRevoked),
    memberName: textOf(firstDefined(row, ["member_name"])),
    memberCode: textOf(firstDefined(row, ["member_code"])),
    packageName: textOf(firstDefined(row, ["package_name"])),
    membershipId: textOf(firstDefined(row, ["membership_id"])),
    validFrom: textOf(firstDefined(row, ["valid_from"])),
    validUntil: textOf(firstDefined(row, ["valid_until"])),
    daysRemaining:
      daysRaw === undefined || daysRaw === null
        ? null
        : Math.trunc(numOf(daysRaw)),
    useCount: Math.trunc(numOf(firstDefined(row, ["use_count"]))),
    lastUsedAt: textOf(firstDefined(row, ["last_used_at"])),
    cardUrl: textOf(firstDefined(row, ["card_url"])),
  };
}

function readWalletBalance(payload: unknown): number {
  if (typeof payload === "number") return payload;
  if (typeof payload === "string") {
    const parsed = Number(payload);
    if (Number.isFinite(parsed)) return parsed;
  }

  const row = asRecord(payload);
  const direct = firstDefined(row, [
    "balance",
    "current_balance",
    "wallet_balance",
    "saldo",
    "total_balance",
    "amount",
    "total",
  ]);
  if (direct !== undefined) return numOf(direct);

  const nested = asRecord(row.wallet);
  const nestedValue = firstDefined(nested, [
    "balance",
    "current_balance",
    "wallet_balance",
    "saldo",
    "amount",
    "total",
  ]);
  if (nestedValue !== undefined) return numOf(nestedValue);

  const rows = arrayFrom(row, ["transactions", "ledger", "items", "data"]);
  if (rows.length > 0) {
    const latest = asRecord(rows[0]);
    return numOf(
      firstDefined(latest, [
        "balance",
        "after_balance",
        "current_balance",
        "saldo",
      ]),
    );
  }
  return 0;
}

function normalizeMembership(entry: unknown, index: number): MembershipInfo {
  const row = asRecord(entry);
  const active = boolOf(firstDefined(row, ["is_active"]), true);
  const status = textOf(firstDefined(row, ["status"]));
  return {
    id: textOf(firstDefined(row, ["id"])) || `membership-${index}`,
    memberName: textOf(firstDefined(row, ["member_name", "member", "name"])),
    packageName:
      textOf(firstDefined(row, ["package_name", "package", "plan"])) || "—",
    startAt: textOf(
      firstDefined(row, ["start_date", "start_at", "starts_at", "started_at"]),
    ),
    endAt: textOf(
      firstDefined(row, ["end_date", "end_at", "ends_at", "expires_at"]),
    ),
    status: status || (active ? "active" : "expired"),
    ptRemaining: Math.trunc(
      numOf(
        firstDefined(row, [
          "session_remaining",
          "pt_remaining",
          "pt_sessions_remaining",
          "remaining_sessions",
        ]),
      ),
    ),
  };
}

function normalizeMemberships(payload: unknown): MembershipInfo[] {
  const rows = arrayFrom(payload, ["items", "memberships", "data"]);
  const items = rows.map(normalizeMembership);
  const rank = (status: string): number => {
    const raw = status.toLowerCase();
    if (raw.includes("active") || raw.includes("aktif")) return 0;
    if (raw.includes("freeze") || raw.includes("beku")) return 1;
    if (raw.includes("pending")) return 2;
    return 3;
  };
  items.sort(
    (a, b) => rank(a.status) - rank(b.status) || b.endAt.localeCompare(a.endAt),
  );
  return items;
}

function normalizeAttendance(payload: unknown): AttendanceInfo | null {
  const row = asRecord(payload);
  if (Object.keys(row).length === 0) return null;
  return {
    memberName: textOf(firstDefined(row, ["member_name", "name"])),
    totalVisits: Math.trunc(numOf(firstDefined(row, ["total_visits", "total"]))),
    visitsThisMonth: Math.trunc(
      numOf(firstDefined(row, ["visits_this_month", "month_visits"])),
    ),
    lastVisit: textOf(firstDefined(row, ["last_visit", "last_visit_at"])),
    ptSessionsUsed: Math.trunc(
      numOf(firstDefined(row, ["pt_sessions_used", "pt_used"])),
    ),
    ptSessionsRemaining: Math.trunc(
      numOf(firstDefined(row, ["pt_sessions_remaining", "pt_remaining"])),
    ),
  };
}

async function resolveMemberRaw(
  token: string,
  branchId: number | undefined,
  user: SessionUser,
): Promise<{ raw: JsonRecord; id: string }> {
  const ownId = String(user.id);

  try {
    const result = await upstream<unknown>(`/members/${ownId}`, {
      token,
      branchId,
    });
    const row = asRecord(result);
    if (Object.keys(row).length > 0) return { raw: row, id: ownId };
  } catch (error) {
    const notFound =
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403);
    if (!notFound) throw error;
  }

  // Some accounts have an auth user id that differs from the member id. In
  // that case, look the member up by e-mail rather than guessing.
  if (user.email) {
    try {
      const result = await upstream<unknown>(
        `/members?q=${encodeURIComponent(user.email)}&per_page=5`,
        { token, branchId },
      );
      const rows = arrayFrom(result, ["items", "members", "data"]).map(asRecord);
      const email = user.email.toLowerCase();
      const match =
        rows.find((row) => textOf(row.email).toLowerCase() === email) ?? rows[0];
      const id = match ? textOf(firstDefined(match, ["id", "member_id"])) : "";
      if (match && id) return { raw: match, id };
    } catch {
      // Fall through to the friendly error below.
    }
  }

  throw new ApiError(
    "Data member untuk akun ini belum tersedia. Hubungi resepsionis Royal Sky.",
    404,
  );
}

/**
 * Loads the authenticated member's card plus best-effort wallet, gate QR,
 * memberships and attendance data. Only the member endpoint is required.
 */
export async function loadMemberData(session: Session): Promise<MemberCardData> {
  const { user } = session;
  const isPinless = user.access === "pinless";
  const token = isPinless ? (await getServiceSession()).token : session.token;
  const branchId = user.homeBranchId > 0 ? user.homeBranchId : undefined;
  const { raw, id } = await resolveMemberRaw(token, branchId, user);
  const base = buildMemberCard(raw);
  const memberPath = `/members/${encodeURIComponent(id)}`;

  if (isPinless) {
    // Limited mode intentionally never fetches wallet or gate-card data.
    const [membershipsResult, attendanceResult] = await Promise.allSettled([
      upstream<unknown>(`${memberPath}/memberships`, { token, branchId }),
      upstream<unknown>(`${memberPath}/attendance-summary`, {
        token,
        branchId,
      }),
    ]);

    const memberships =
      membershipsResult.status === "fulfilled"
        ? normalizeMemberships(membershipsResult.value)
        : [];
    const attendance =
      attendanceResult.status === "fulfilled"
        ? normalizeAttendance(attendanceResult.value)
        : null;
    const activeMembership =
      memberships.find((item) =>
        item.status.toLowerCase().includes("active"),
      ) ?? memberships[0];

    return buildMemberCard(raw, {
      wallet: 0,
      gateCode: "",
      gatePayload: "",
      gateStatus: "",
      gateActive: false,
      gateLoaded: false,
      membershipId: activeMembership?.id || base.membershipId,
      memberships,
      attendance,
      lastUsedAt: attendance?.lastVisit || base.lastUsedAt,
      isLimited: true,
    });
  }

  const [walletResult, gateResult, membershipsResult, attendanceResult] =
    await Promise.allSettled([
      upstream<unknown>(`${memberPath}/wallet`, { token, branchId }),
      upstream<unknown>(`${memberPath}/gate-card`, { token, branchId }),
      upstream<unknown>(`${memberPath}/memberships`, { token, branchId }),
      upstream<unknown>(`${memberPath}/attendance-summary`, {
        token,
        branchId,
      }),
    ]);

  const wallet =
    walletResult.status === "fulfilled"
      ? readWalletBalance(walletResult.value)
      : base.wallet;
  const gate =
    gateResult.status === "fulfilled"
      ? normalizeGateCard(gateResult.value)
      : null;
  const memberships =
    membershipsResult.status === "fulfilled"
      ? normalizeMemberships(membershipsResult.value)
      : [];
  const attendance =
    attendanceResult.status === "fulfilled"
      ? normalizeAttendance(attendanceResult.value)
      : null;

  const activeMembership =
    memberships.find((item) =>
      item.status.toLowerCase().includes("active"),
    ) ?? memberships[0];

  return buildMemberCard(raw, {
    wallet,
    gateCode: gate?.code ?? "",
    gatePayload: gate?.qrPayload ?? "",
    gateStatus: gate?.status ?? "",
    gateActive: gate ? gate.isValid && gate.status !== "revoked" : false,
    gateLoaded: gate !== null,
    membershipId:
      gate?.membershipId || activeMembership?.id || base.membershipId,
    memberships,
    attendance,
    lastUsedAt:
      gate?.lastUsedAt ||
      attendance?.lastVisit ||
      base.lastUsedAt,
    isLimited: false,
  });
}
