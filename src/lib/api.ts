const DEFAULT_BASE_URL = "https://api.mpdev.my.id/api/v1";

export const API_BASE_URL = (
  process.env.ROYALE_API_BASE_URL?.trim() || DEFAULT_BASE_URL
).replace(/\/+$/, "");

const TIMEOUT_MS = (() => {
  const parsed = Number(process.env.ROYALE_API_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15_000;
})();

type Envelope = {
  success?: boolean;
  code?: number;
  message?: string;
  data?: unknown;
  trace_id?: string;
};

export type ApiErrorFields = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: number;
  readonly errors: ApiErrorFields;
  readonly traceId?: string;

  constructor(
    message: string,
    status: number,
    code = status,
    errors: ApiErrorFields = {},
    traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.traceId = traceId;
  }

  get isSessionError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseErrors(value: unknown): ApiErrorFields {
  if (!isRecord(value)) return {};
  const out: ApiErrorFields = {};
  for (const [key, raw] of Object.entries(value)) {
    if (Array.isArray(raw)) {
      out[key] = raw.map((item) => String(item));
    } else if (raw != null) {
      out[key] = [String(raw)];
    }
  }
  return out;
}

function gatewayMessage(status: number): string {
  switch (status) {
    case 429:
      return "Terlalu banyak percobaan. Coba lagi dalam beberapa saat.";
    case 520:
    case 521:
      return `Server tidak dapat dijangkau (${status}). Coba lagi beberapa saat.`;
    case 522:
      return "Server tidak merespons (522). Coba lagi beberapa saat.";
    case 523:
      return "Server tidak ditemukan (523). Coba lagi beberapa saat.";
    case 524:
      return "Server kehabisan waktu merespons (524). Coba lagi beberapa saat.";
    default:
      return `Permintaan gagal (${status}).`;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string;
  branchId?: number | string;
  body?: unknown;
  timeoutMs?: number;
};

/**
 * Calls the Royale Sky API and unwraps its `{ success, code, message, data }`
 * envelope. Only import this from server code — the bearer token lives here.
 */
export async function upstream<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    token,
    branchId,
    body,
    timeoutMs = TIMEOUT_MS,
  } = options;

  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (branchId !== undefined && branchId !== null && `${branchId}` !== "0") {
    headers.set("X-Branch-Id", String(branchId));
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ApiError(
      timedOut
        ? "Server terlalu lama merespons. Coba lagi beberapa saat."
        : "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
      0,
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  const envelope: Envelope = isRecord(payload) ? payload : {};
  const failed = response.status >= 400 || envelope.success === false;

  if (failed) {
    const serverMessage =
      typeof envelope.message === "string" && envelope.message.trim()
        ? envelope.message.trim()
        : "";
    const data = isRecord(envelope.data) ? envelope.data : {};
    const errors = parseErrors(data.errors);
    const firstFieldMessage = Object.values(errors).flat().find(Boolean);
    const message =
      firstFieldMessage ||
      (serverMessage && serverMessage !== "api.validation_failed"
        ? serverMessage
        : gatewayMessage(response.status));

    throw new ApiError(
      message,
      response.status,
      typeof envelope.code === "number" ? envelope.code : response.status,
      errors,
      envelope.trace_id,
    );
  }

  return (envelope.data ?? null) as T;
}
