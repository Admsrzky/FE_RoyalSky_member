import { ApiError, upstream } from "./api";
import type { SessionUser } from "./types";

type LoginPayload = {
  token?: string;
  user?: Record<string, unknown>;
};

type ServiceSession = {
  token: string;
  user: SessionUser;
  expiresAt: number;
};

type ServiceRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  branchId?: number | string;
  body?: unknown;
  timeoutMs?: number;
};

const SERVICE_CACHE_MS = 45 * 60 * 1000;

let cached: ServiceSession | null = null;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function serviceAccountReady(): boolean {
  return serviceCredentials() !== null;
}

export function pinlessLoginEnabled(): boolean {
  return process.env.ROYALE_ALLOW_PINLESS_LOGIN === "1";
}

function serviceCredentials(): { userId: number; pin: string } | null {
  const userId = Number(process.env.ROYALE_SERVICE_USER_ID);
  const pin = readString(process.env.ROYALE_SERVICE_PIN);
  if (!Number.isFinite(userId) || userId <= 0 || !/^\d{4,6}$/.test(pin)) {
    return null;
  }
  return { userId, pin };
}

export function pinlessServiceReady(): boolean {
  return pinlessLoginEnabled() && serviceAccountReady();
}

export async function getServiceSession(forceRefresh = false): Promise<ServiceSession> {
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const credentials = serviceCredentials();
  if (!credentials) {
    throw new ApiError(
      "Mode tanpa PIN belum dikonfigurasi. Hubungi pengelola portal.",
      503,
    );
  }

  const data = await upstream<LoginPayload>("/auth/login", {
    method: "POST",
    body: { user_id: credentials.userId, pin: credentials.pin },
  });

  const token = readString(data?.token);
  const rawUser = data?.user ?? {};
  const id = Number(rawUser.id);
  const roles = readList(rawUser.roles);
  if (!token || !Number.isFinite(id) || id <= 0) {
    throw new ApiError("Akun layanan portal tidak dapat masuk.", 503);
  }

  const user: SessionUser = {
    id,
    name: readString(rawUser.name) || "Royal Sky Service",
    email: readString(rawUser.email),
    phone: readString(rawUser.phone),
    homeBranchId: Number(rawUser.home_branch_id) || 1,
    roles,
    posAreas: readList(rawUser.pos_areas),
    permissions: readList(rawUser.permissions),
    createdAt: readString(rawUser.created_at),
    access: "pin",
  };

  cached = {
    token,
    user,
    expiresAt: Date.now() + SERVICE_CACHE_MS,
  };
  return cached;
}

/**
 * Performs a request with the server-side service account. The token never
 * reaches the browser. A stale/revoked token is refreshed once.
 */
export async function serviceRequest<T>(
  path: string,
  options: ServiceRequestOptions = {},
): Promise<T> {
  const session = await getServiceSession();
  try {
    return await upstream<T>(path, { ...options, token: session.token });
  } catch (error) {
    const authFailure =
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403);
    if (!authFailure) throw error;
    const refreshed = await getServiceSession(true);
    return upstream<T>(path, { ...options, token: refreshed.token });
  }
}
