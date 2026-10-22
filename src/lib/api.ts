import { request as httpsRequest } from "node:https";
import * as tls from "node:tls";

const DEFAULT_BASE_URL = "https://api.mpdev.my.id/api/v1";

export const API_BASE_URL = (
  process.env.ROYALE_API_BASE_URL?.trim() || DEFAULT_BASE_URL
).replace(/\/+$/, "");

const TIMEOUT_MS = (() => {
  const parsed = Number(process.env.ROYALE_API_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15_000;
})();

const TLS_COMPAT = process.env.ROYALE_API_TLS_COMPAT !== "0";

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

type TransportResult = {
  status: number;
  text: string;
};

function errorText(error: unknown, depth = 0): string {
  if (depth > 4 || !(error instanceof Error)) return String(error);
  const cause = (error as Error & { cause?: unknown }).cause;
  return `${error.name} ${error.message} ${errorText(cause, depth + 1)}`;
}

/**
 * Some corporate networks intercept TLS with an old/self-signed proxy CA that
 * Node's OpenSSL policy rejects (`CA certificate key too weak`). Browsers trust
 * the same CA from the Windows certificate store. Detect only that class of
 * failure so ordinary network errors are not retried through another stack.
 */
function isCertificateError(error: unknown): boolean {
  const text = errorText(error).toLowerCase();
  return [
    "certificate",
    "self-signed",
    "self signed",
    "key too weak",
    "unable to verify",
    "unable_to_verify",
    "unable to get local issuer",
    "cert_",
    "ssl routines",
  ].some((needle) => text.includes(needle));
}

function systemCaCertificates(): string[] {
  const compatTls = tls as typeof tls & {
    getCACertificates?: (type: "system") => string[];
  };
  try {
    return compatTls.getCACertificates?.("system") ?? [];
  } catch {
    return [];
  }
}

/**
 * Fallback transport for a trusted OS certificate store that contains a legacy
 * CA. Hostname and chain verification stay enabled; only the OpenSSL security
 * level is relaxed enough to accept the proxy's old root certificate.
 */
function nodeHttpsRequest(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<TransportResult> {
  return new Promise((resolve, reject) => {
    const headers = new Headers(init.headers);
    headers.set("Accept-Encoding", "identity");

    const body =
      typeof init.body === "string" ? init.body : undefined;
    if (body !== undefined) {
      headers.set("Content-Length", String(Buffer.byteLength(body)));
    }

    const ca = systemCaCertificates();
    const request = httpsRequest(
      url,
      {
        method: init.method ?? "GET",
        headers: Object.fromEntries(headers.entries()),
        ca: ca.length > 0 ? ca : undefined,
        ciphers: "DEFAULT@SECLEVEL=0",
        minVersion: "TLSv1.2",
        timeout: timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer | string) => {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
        response.on("error", reject);
      },
    );

    request.on("timeout", () => {
      const error = new Error("Upstream request timed out");
      error.name = "TimeoutError";
      request.destroy(error);
    });
    request.on("error", reject);
    if (body !== undefined) request.write(body);
    request.end();
  });
}

async function sendRequest(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<TransportResult> {
  try {
    const response = await fetch(url, init);
    return { status: response.status, text: await response.text() };
  } catch (error) {
    if (!TLS_COMPAT || !isCertificateError(error)) throw error;
    return nodeHttpsRequest(url, init, timeoutMs);
  }
}

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

  let result: TransportResult;
  try {
    result = await sendRequest(
      `${API_BASE_URL}${path}`,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      },
      timeoutMs,
    );
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

  const text = result.text;
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  const envelope: Envelope = isRecord(payload) ? payload : {};
  const failed = result.status >= 400 || envelope.success === false;

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
        : gatewayMessage(result.status));

    throw new ApiError(
      message,
      result.status,
      typeof envelope.code === "number" ? envelope.code : result.status,
      errors,
      envelope.trace_id,
    );
  }

  return (envelope.data ?? null) as T;
}
