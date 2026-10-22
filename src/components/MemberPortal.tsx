"use client";

import { useEffect, useState } from "react";

import { daysUntil, initialsOf, numberID, shortDate } from "@/lib/format";
import type { MemberCardData } from "@/lib/types";

import { MemberCard, type CardSide } from "./MemberCard";
import { QrZoomModal } from "./QrZoomModal";
import { ThemeToggle } from "./ThemeToggle";
import { Brand } from "./brand";
import { Icon } from "./icons";

type MemberPortalProps = {
  initial: MemberCardData;
  preview?: boolean;
};

type ToastState = {
  message: string;
  tone: "success" | "danger";
};

function statusTone(member: MemberCardData): "active" | "danger" | "amber" {
  if (member.isExpired) return "danger";
  if (member.isFrozen || member.status.toLowerCase().includes("pending")) {
    return "amber";
  }
  return "active";
}

function statusWord(member: MemberCardData): string {
  if (member.isExpired) return "Expired";
  if (member.isFrozen) return "Frozen";
  if (member.status.toLowerCase().includes("pending")) return "Pending";
  return "Aktif";
}

function membershipWord(status: string): string {
  const raw = status.toLowerCase();
  if (raw.includes("active") || raw.includes("aktif")) return "AKTIF";
  if (raw.includes("freeze") || raw.includes("beku")) return "FROZEN";
  if (raw.includes("pending")) return "PENDING";
  if (raw.includes("expire")) return "EXPIRED";
  return status.toUpperCase();
}

function membershipTone(status: string): string {
  const raw = status.toLowerCase();
  if (raw.includes("active") || raw.includes("aktif")) return "is-active";
  if (raw.includes("freeze") || raw.includes("beku")) return "is-amber";
  if (raw.includes("pending")) return "is-amber";
  return "is-muted";
}

export function MemberPortal({ initial, preview = false }: MemberPortalProps) {
  const [member, setMember] = useState(initial);
  const [side, setSide] = useState<CardSide>("front");
  const [qrOpen, setQrOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const tone = statusTone(member);
  const activeMembership =
    member.memberships.find((item) =>
      item.status.toLowerCase().includes("active"),
    ) ?? member.memberships[0];
  const periodStart = activeMembership?.startAt || member.joinedAt;
  const periodEnd = activeMembership?.endAt || member.expiresAt;
  const endDays = daysUntil(periodEnd);
  const startDays = daysUntil(periodStart);
  const totalDays =
    endDays === null
      ? 0
      : startDays === null
        ? Math.max(endDays, 1)
        : Math.max(endDays - startDays, 1);
  const remainingDays = member.daysRemaining;
  const progress =
    remainingDays === null
      ? 100
      : Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
  const ptRemaining = Math.max(0, member.ptTotal - member.ptUsed);
  const attendance = member.attendance;
  const firstName = member.name.trim().split(/\s+/)[0] || member.name;
  const qrActive =
    member.isActive && (!member.gateLoaded || member.gateActive);

  function showToast(message: string, toastTone: ToastState["tone"] = "success") {
    setToast({ message, tone: toastTone });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(member.cardNumber);
      showToast("Nomor member disalin.");
    } catch {
      showToast(`Salin manual: ${member.cardNumber}`, "danger");
    }
  }

  function openQr() {
    if (member.isLimited) {
      showToast(
        "QR akses pintu terkunci. Fitur ini memerlukan login PIN.",
        "danger",
      );
      return;
    }
    if (!member.hasGateQr) {
      showToast("QR akses pintu belum tersedia untuk akun ini.", "danger");
      return;
    }
    setQrOpen(true);
  }

  async function refresh() {
    if (preview) {
      showToast("Mode pratinjau memakai data contoh.");
      return;
    }

    setSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch("/api/member", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/");
        return;
      }
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; member?: MemberCardData }
        | null;

      if (!response.ok || !payload?.ok || !payload.member) {
        setSyncError(
          payload?.message || "Data terbaru belum bisa dimuat. Coba lagi.",
        );
        return;
      }

      setMember(payload.member);
      if (!payload.member.hasGateQr) setQrOpen(false);
      setLastSynced(
        `${new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        }).format(new Date())} WIB`,
      );
      showToast("Kartu berhasil diperbarui.");
    } catch {
      setSyncError(
        "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.",
      );
    } finally {
      setSyncing(false);
    }
  }

  function logout() {
    setLoggingOut(true);
    window.location.assign("/api/auth/logout");
  }

  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-topbar-inner">
          <Brand />
          <div className="topbar-actions">
            {preview ? (
              <span className="topbar-chip is-preview">
                <span className="live-dot" />
                MODE PRATINJAU
              </span>
            ) : member.isLimited ? (
              <span className="topbar-chip is-preview">
                <span className="live-dot" />
                MODE TERBATAS
              </span>
            ) : (
              <span className="topbar-chip">
                <span className="live-dot" />
                MEMBER PORTAL
              </span>
            )}

            <div className="user-chip">
              <span className="avatar">{initialsOf(member.name)}</span>
              <span className="user-name">{member.name}</span>
            </div>

            <ThemeToggle />

            {preview ? (
              <a className="icon-btn" href="/" aria-label="Kembali ke halaman login">
                <Icon name="arrow-right" size={17} />
              </a>
            ) : (
              <button
                type="button"
                className="icon-btn"
                onClick={logout}
                disabled={loggingOut}
                aria-label="Keluar dari portal"
              >
                <Icon name="logout" size={17} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="portal-main">
        {preview && (
          <div className="preview-banner">
            <Icon name="spark" size={15} />
            <span>Pratinjau desain dengan data contoh.</span>
            <a href="/">Buka portal login</a>
          </div>
        )}

        {member.isLimited && !preview && (
          <div className="preview-banner limited-banner" role="status">
            <Icon name="lock" size={15} />
            <span>
              Akses terbatas: wallet dan QR akses pintu disembunyikan sampai
              login PIN tersedia kembali.
            </span>
          </div>
        )}

        <section className="portal-intro" aria-labelledby="portal-title">
          <div>
            <span className="eyebrow">
              <span className="live-dot" />
              Kartu member digital
            </span>
            <h1 id="portal-title">Halo, {firstName}.</h1>
            <p>
              {member.isLimited
                ? "Berikut kartu dan ringkasan membership Anda. Wallet dan QR pintu dinonaktifkan pada mode terbatas."
                : "Berikut ringkasan membership dan kartu digital Anda hari ini."}
            </p>
          </div>

          <span className={`status-pill is-${tone}`}>
            <span className="status-dot" />
            {member.statusLabel}
          </span>
        </section>

        <div className="portal-grid">
          <section className="card-column" aria-label="Kartu member digital">
            <div className="card-status-line">
              <span className={`status-pill is-${tone}`}>
                <span className="status-dot" />
                {member.statusLabel}
              </span>
              <span className="card-sync">
                {lastSynced ? `Diperbarui ${lastSynced}` : "Tersinkron dengan server"}
              </span>
            </div>

            <div className="card-frame">
              <MemberCard data={member} side={side} onQrClick={openQr} />
            </div>

            <div className="card-actions">
              <button
                type="button"
                className="btn-flip"
                onClick={() =>
                  setSide((current) => (current === "front" ? "back" : "front"))
                }
                aria-pressed={side === "back"}
              >
                <Icon name="flip" size={18} />
                {side === "back" ? "Lihat sisi depan" : "Lihat sisi belakang"}
              </button>

              <div className="card-action-row">
                <button type="button" className="btn-ghost" onClick={copyCode}>
                  <Icon name="copy" size={14} />
                  Salin kode
                </button>
                {!member.isLimited && (
                  <button type="button" className="btn-ghost" onClick={openQr}>
                    <Icon name="qr" size={14} />
                    QR pintu
                  </button>
                )}
                {preview ? (
                  <a className="btn-ghost" href="/">
                    <Icon name="arrow-right" size={14} />
                    Ke login
                  </a>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={refresh}
                    disabled={syncing}
                  >
                    <Icon name="refresh" size={14} />
                    {syncing ? "Memuat..." : "Perbarui"}
                  </button>
                )}
              </div>
            </div>

            {syncing && (
              <div className="sync-bar" aria-hidden="true">
                <span />
              </div>
            )}

            {syncError && (
              <div className="sync-error" role="alert">
                <Icon name="alert" size={15} />
                <span>{syncError}</span>
                <button type="button" onClick={refresh} disabled={syncing}>
                  Coba lagi
                </button>
              </div>
            )}

            <p className="card-note">
              <Icon name={member.isLimited ? "lock" : "shield"} size={14} />
              {member.isLimited
                ? "Kartu tampil dalam mode terbatas. QR akses pintu memerlukan login PIN."
                : "Tunjukkan kartu atau QR ini kepada petugas bila diminta."}
            </p>
          </section>

          <section className="info-column" aria-label="Ringkasan membership">
            <div className="stat-grid">
              <article className="stat" data-tone={tone}>
                <span className="stat-label">Status</span>
                <span className="stat-value">{statusWord(member)}</span>
                <span className="stat-sub">{member.planDisplay}</span>
              </article>

              <article className="stat" data-tone="cyan">
                <span className="stat-label">Sisa hari</span>
                <span className="stat-value">
                  {remainingDays === null ? "∞" : Math.max(0, remainingDays)}
                </span>
                <span className="stat-sub">
                  {remainingDays === null
                    ? "Tanpa batas"
                    : remainingDays < 0
                      ? "Sudah berakhir"
                      : "hari lagi"}
                </span>
              </article>

              {member.isLimited ? (
                <article className="stat" data-tone="amber">
                  <span className="stat-label">Akses</span>
                  <span className="stat-value">Terbatas</span>
                  <span className="stat-sub">Wallet & QR perlu PIN</span>
                </article>
              ) : (
                <article className="stat" data-tone="cyan">
                  <span className="stat-label">Saldo wallet</span>
                  <span className="stat-value stat-value-money">
                    {member.walletLabel}
                  </span>
                  <span className="stat-sub">Siap dipakai di club</span>
                </article>
              )}

              <article className="stat" data-tone="violet">
                <span className="stat-label">Poin loyalty</span>
                <span className="stat-value">{numberID(member.points)}</span>
                <span className="stat-sub">poin terkumpul</span>
              </article>
            </div>

            <section className="panel">
              <div className="panel-head">
                <span className="panel-title">Membership</span>
                <span className={`badge is-${tone}`}>{member.statusLabel}</span>
              </div>

              <div className="plan-row">
                <div>
                  <h2 className="plan-name">{member.planDisplay}</h2>
                  <p className="plan-meta">
                    {member.tierBadge}
                    {member.membershipId ? ` · ID ${member.membershipId}` : ""}
                  </p>
                </div>
                <span className="plan-days">
                  <b>{remainingDays === null ? "∞" : Math.max(0, remainingDays)}</b>
                  <span>hari tersisa</span>
                </span>
              </div>

              <div
                className="progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                aria-label="Sisa masa aktif membership"
              >
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="fact-grid">
                <div className="fact">
                  <span className="fact-label">Berlaku sampai</span>
                  <span className="fact-value">{member.expiryLabel}</span>
                  <span className="fact-sub">
                    {remainingDays === null
                      ? "Tanpa batas waktu"
                      : remainingDays < 0
                        ? "Masa aktif berakhir"
                        : `${remainingDays} hari lagi`}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-label">Sesi PT</span>
                  <span className="fact-value">
                    {member.ptTotal > 0 ? `${ptRemaining} / ${member.ptTotal}` : "—"}
                  </span>
                  <span className="fact-sub">
                    {member.ptTotal > 0 ? "sesi tersisa" : "Tidak termasuk PT"}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-label">Terdaftar</span>
                  <span className="fact-value">{member.joinedLabel}</span>
                  <span className="fact-sub">Sejak bergabung</span>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <span className="panel-title">Aktivitas & fasilitas</span>
                <span className="panel-kicker">Attendance</span>
              </div>

              <div className="split-grid">
                <div className="metric-list">
                  <div className="metric">
                    <span className="metric-icon">
                      <Icon name="activity" size={15} />
                    </span>
                    <div>
                      <span className="metric-label">Kunjungan bulan ini</span>
                      <span className="metric-value">
                        {numberID(attendance?.visitsThisMonth ?? 0)}
                      </span>
                    </div>
                  </div>
                  <div className="metric">
                    <span className="metric-icon">
                      <Icon name="calendar" size={15} />
                    </span>
                    <div>
                      <span className="metric-label">Total kunjungan</span>
                      <span className="metric-value">
                        {numberID(attendance?.totalVisits ?? 0)}
                      </span>
                    </div>
                  </div>
                  <div className="metric">
                    <span className="metric-icon">
                      <Icon name="clock" size={15} />
                    </span>
                    <div>
                      <span className="metric-label">Kunjungan terakhir</span>
                      <span className="metric-value metric-value-small">
                        {shortDate(attendance?.lastVisit)}
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="info-list">
                  <li>
                    <span>Fasilitas</span>
                    <b>{member.facility.toUpperCase()}</b>
                  </li>
                  <li>
                    <span>No. anggota</span>
                    <b className="mono">{member.cardNumber}</b>
                  </li>
                  <li>
                    <span>Email</span>
                    <b>{member.email || "—"}</b>
                  </li>
                  <li>
                    <span>Telepon</span>
                    <b>{member.phone || "—"}</b>
                  </li>
                </ul>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <span className="panel-title">Riwayat membership</span>
                <span className="panel-kicker">
                  {member.memberships.length} catatan
                </span>
              </div>

              {member.memberships.length > 0 ? (
                <div className="history-list">
                  {member.memberships.slice(0, 5).map((item) => (
                    <div className="history-item" key={item.id}>
                      <span className="history-icon">
                        <Icon name="spark" size={15} />
                      </span>
                      <div className="history-body">
                        <span className="history-name">{item.packageName}</span>
                        <span className="history-meta">
                          {shortDate(item.startAt)} — {shortDate(item.endAt)}
                          {item.ptRemaining > 0
                            ? ` · ${item.ptRemaining} sesi PT`
                            : ""}
                        </span>
                      </div>
                      <span className={`badge ${membershipTone(item.status)}`}>
                        {membershipWord(item.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Icon name="spark" size={22} />
                  <span>Belum ada riwayat membership untuk akun ini.</span>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <span>© 2026 Royal Sky Gym Club · KCP Banten</span>
        <span>Kartu digital resmi member · Data tersinkron dengan server</span>
      </footer>

      {qrOpen && !member.isLimited && member.hasGateQr && (
        <QrZoomModal
          data={member.qrData}
          memberName={member.name}
          cardNumber={member.cardNumber}
          active={qrActive}
          onClose={() => setQrOpen(false)}
        />
      )}

      {toast && (
        <div className={`toast is-${toast.tone}`} role="status" aria-live="polite">
          <Icon name={toast.tone === "danger" ? "alert" : "check"} size={15} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
