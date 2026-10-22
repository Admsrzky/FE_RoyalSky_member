const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** `Rp 1.234.567` — Indonesian thousand separators. */
export function rupiah(amount: number): string {
  const negative = amount < 0;
  const rounded = Math.round(Math.abs(amount));
  const digits = rounded.toString();
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ".";
    out += digits[i];
  }
  return `${negative ? "-" : ""}Rp ${out}`;
}

/** `1.234` — plain number with thousand separators. */
export function numberID(value: number): string {
  const negative = value < 0;
  const rounded = Math.round(Math.abs(value));
  const digits = rounded.toString();
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ".";
    out += digits[i];
  }
  return `${negative ? "-" : ""}${out}`;
}

type DateParts = { year: number; month: number; day: number };

function parseDateParts(value: unknown): DateParts | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text === "—" || text === "-") return null;

  // API dates are ISO-like: `2026-12-31`, `2026-12-31 23:59:59`, `2026-12-31T...`.
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // `12/2025` (month/year) used by older membership cards.
  const monthYear = text.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYear) {
    const month = Number(monthYear[1]);
    if (month >= 1 && month <= 12) {
      return { year: Number(monthYear[2]), month, day: 1 };
    }
  }

  return null;
}

/** `12 Okt 2026`, or `—` when the value cannot be parsed. */
export function shortDate(value: unknown): string {
  const parts = parseDateParts(value);
  if (!parts) return "—";
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

/** Today's date in Jakarta as `YYYY-MM-DD`, independent of the browser zone. */
export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function utcDay(parts: DateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

/**
 * Whole days until the given date (negative when passed). Compared at
 * date-level in Jakarta, so an expiry date is valid through the end of that
 * day regardless of the viewer's timezone.
 */
export function daysUntil(value: unknown): number | null {
  const parts = parseDateParts(value);
  if (!parts) return null;
  const today = parseDateParts(todayJakarta());
  if (!today) return null;
  return Math.round((utcDay(parts) - utcDay(today)) / 86_400_000);
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "RS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
