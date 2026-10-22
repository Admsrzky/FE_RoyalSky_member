"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { demoMember } from "@/lib/demo";

import { MemberCard } from "./MemberCard";
import { Brand } from "./brand";
import { Icon } from "./icons";

type LoginViewProps = {
  notice?: string;
  clearSession?: boolean;
  pinless?: boolean;
};

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function LoginView({
  notice,
  clearSession = false,
  pinless = false,
}: LoginViewProps) {
  const router = useRouter();
  const pinRef = useRef<HTMLInputElement>(null);
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clearSession) return;
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => {
      // The login screen is still usable if the cleanup request fails.
    });
  }, [clearSession]);

  const canSubmit =
    identifier.trim().length > 0 &&
    (pinless || /^\d{4,6}$/.test(pin)) &&
    !loading;

  function pressDigit(digit: string) {
    setError(null);
    setPin((current) => (current.length >= 6 ? current : `${current}${digit}`));
  }

  function erase() {
    setError(null);
    setPin((current) => current.slice(0, -1));
  }

  function clearPin() {
    setError(null);
    setPin("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      if (!identifier.trim()) {
        setError("Masukkan email atau ID member Anda.");
      } else if (!pinless && !/^\d{4,6}$/.test(pin)) {
        setError("PIN harus terdiri dari 4–6 digit.");
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          pinless
            ? { identifier: identifier.trim() }
            : { identifier: identifier.trim(), pin },
        ),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setError(
          payload?.message ||
            "Login belum bisa diproses. Periksa data Anda dan coba lagi.",
        );
        if (!pinless) {
          setPin("");
          pinRef.current?.focus();
        }
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <header className="login-topbar">
        <Brand />
        <div className="topbar-actions">
          <span className={`topbar-chip${pinless ? " is-preview" : ""}`}>
            <span className="live-dot" />
            {pinless ? "MODE TANPA PIN" : "PORTAL MEMBER"}
          </span>
          <a className="ghost-link" href="/preview">
            Lihat contoh kartu
            <Icon name="arrow-up-right" size={14} />
          </a>
        </div>
      </header>

      <main className="login-grid">
        <section className="login-hero" aria-labelledby="login-hero-title">
          <span className="eyebrow">
            <span className="live-dot" />
            Digital member pass
          </span>
          <h1 id="login-hero-title">
            Kartu member Anda, <em>selalu</em> dalam genggaman.
          </h1>
          <p>
            {pinless
              ? "Masuk dengan email atau ID member untuk membuka kartu digital dan ringkasan membership Anda."
              : "Masuk dengan PIN untuk membuka kartu digital Royal Sky, QR akses pintu, saldo wallet, poin loyalty, dan riwayat membership Anda."}
          </p>

          <ul className="feature-list">
            {pinless ? (
              <>
                <li>
                  <span className="feature-check">
                    <Icon name="check" size={13} />
                  </span>
                  Kartu digital, status membership, dan sisa hari.
                </li>
                <li>
                  <span className="feature-check">
                    <Icon name="check" size={13} />
                  </span>
                  Poin loyalty, sesi PT, dan riwayat membership.
                </li>
                <li>
                  <span className="feature-check">
                    <Icon name="lock" size={13} />
                  </span>
                  Wallet dan QR akses pintu terkunci sampai login PIN tersedia.
                </li>
              </>
            ) : (
              <>
                <li>
                  <span className="feature-check">
                    <Icon name="check" size={13} />
                  </span>
                  QR pintu selalu siap dipindai di gerbang gym.
                </li>
                <li>
                  <span className="feature-check">
                    <Icon name="check" size={13} />
                  </span>
                  Status membership, sisa hari, dan sesi PT dalam satu tampilan.
                </li>
                <li>
                  <span className="feature-check">
                    <Icon name="check" size={13} />
                  </span>
                  Data tersinkron langsung dengan sistem Royal Sky.
                </li>
              </>
            )}
          </ul>

          <div className="hero-card-stage" aria-hidden="true">
            <MemberCard data={demoMember} side="front" />
          </div>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="auth-card">
            <div className="auth-head">
              <span className="auth-icon">
                <Icon name="lock" size={19} />
              </span>
              <div>
                <span className="eyebrow">Member access</span>
                <h2 id="login-title">Masuk ke portal</h2>
              </div>
            </div>

            <p className="auth-lead">
              {pinless
                ? "Gunakan email atau ID member yang terdaftar. PIN tidak diminta pada mode sementara ini."
                : "Gunakan email atau ID akun yang terdaftar di Royal Sky, lalu masukkan PIN member Anda."}
            </p>

            {pinless && (
              <div className="alert info mode-note" role="status">
                <Icon name="lock" size={16} />
                <span>
                  Akses terbatas: kartu dan membership tampil, tetapi wallet dan
                  QR akses pintu disembunyikan.
                </span>
              </div>
            )}

            {notice && !error && (
              <div className="alert info" role="status">
                <Icon name="clock" size={16} />
                <span>{notice}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <label className="field-label" htmlFor="identifier">
                Email atau ID member
              </label>
              <div className="field">
                <Icon name="at" size={17} />
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="nama@email.com atau ID member"
                  value={identifier}
                  onChange={(event) => {
                    setError(null);
                    setIdentifier(event.target.value);
                  }}
                />
              </div>

              {!pinless && (
                <>
              <div className="pin-head">
                <label htmlFor="pin">PIN</label>
                <span>{pin.length} / 6</span>
              </div>

              <div
                className={`pin-wrap${error ? " has-error" : ""}`}
                onClick={() => pinRef.current?.focus()}
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={index}
                    className={`pin-slot${index < pin.length ? " is-filled" : ""}${
                      index === pin.length ? " is-next" : ""
                    }`}
                  >
                    {index < pin.length && <span className="pin-dot" />}
                  </span>
                ))}
                <input
                  ref={pinRef}
                  id="pin"
                  name="pin"
                  className="pin-input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  aria-label="PIN member"
                  onChange={(event) => {
                    setError(null);
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                  }}
                />
              </div>

              <div className="keypad" aria-label="Keypad PIN">
                {KEYPAD.map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => pressDigit(digit)}
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  className="key-action"
                  onClick={clearPin}
                  disabled={pin.length === 0}
                >
                  Hapus
                </button>
                <button type="button" onClick={() => pressDigit("0")}>
                  0
                </button>
                <button
                  type="button"
                  className="key-action key-back"
                  onClick={erase}
                  aria-label="Hapus satu digit"
                  disabled={pin.length === 0}
                >
                  <Icon name="backspace" size={19} />
                </button>
              </div>
                </>
              )}

              {error && (
                <div className="alert" role="alert">
                  <Icon name="alert" size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary auth-submit"
                disabled={!canSubmit}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    MEMBUKA...
                  </>
                ) : (
                  <>
                    MASUK
                    <Icon name="arrow-right" size={17} />
                  </>
                )}
              </button>
            </form>

            <div className="auth-foot">
              <span>
                <Icon name="shield" size={13} />
                Koneksi aman
              </span>
              <span>{pinless ? "Akses terbatas" : "PIN 4–6 digit"}</span>
            </div>
          </div>

          <p className="auth-help">
            {pinless
              ? "Mode tanpa PIN bersifat sementara. Wallet dan QR pintu akan aktif kembali setelah login PIN diperbaiki."
              : "Belum punya akses? Hubungi resepsionis Royal Sky atau gunakan menu daftar member di klub."}
          </p>
        </section>
      </main>

      <footer className="login-footer">
        <span>© 2026 Royal Sky Gym Club · KCP Banten</span>
        <span>Kartu digital resmi member</span>
      </footer>
    </div>
  );
}
