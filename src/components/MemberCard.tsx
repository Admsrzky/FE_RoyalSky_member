"use client";
import { withBasePath } from "@/lib/base-path";

import { QRCodeSVG } from "qrcode.react";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import type { MemberCardData } from "@/lib/types";

import { BankBjbMark, CrownMark } from "./brand";
import { Icon } from "./icons";

export type CardSide = "front" | "back";

type MemberCardProps = {
  data: MemberCardData;
  side?: CardSide;
  onQrClick?: () => void;
  className?: string;
};

export function MemberCard({
  data,
  side = "front",
  onQrClick,
  className,
}: MemberCardProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const measure = () => {
      const width = element.clientWidth;
      if (width > 0) setScale(width / 340);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={className ? `member-card ${className}` : "member-card"}
    >
      <div className={`mc-flip${side === "back" ? " is-back" : ""}`}>
        <div className="mc-face mc-front" aria-hidden={side !== "front"}>
          <CardSurface
            data={data}
            side="front"
            scale={scale}
            onQrClick={onQrClick}
          />
        </div>
        <div className="mc-face mc-back" aria-hidden={side !== "back"}>
          <CardSurface
            data={data}
            side="back"
            scale={scale}
            onQrClick={onQrClick}
          />
        </div>
      </div>
    </div>
  );
}

function CardSurface({
  data,
  side,
  scale,
  onQrClick,
}: {
  data: MemberCardData;
  side: CardSide;
  scale: number;
  onQrClick?: () => void;
}) {
  const active = data.isActive && (!data.gateLoaded || data.gateActive);
  const label =
    side === "front"
      ? `Kartu member ${data.name}, ${data.tierBadge}, berlaku sampai ${data.expiryLabel}`
      : `Sisi belakang kartu member ${data.name}, nomor ${data.cardNumber}`;

  return (
    <div
      className="mc-surface"
      style={{
        transform: `scale(${scale})`,
        visibility: scale > 0 ? "visible" : "hidden",
      }}
      role="img"
      aria-label={label}
    >
      <div
        className={`mc-base${data.isExpired ? " is-expired" : ""}`}
        style={{ "--mc-accent": data.isExpired ? "#ff6b6b" : "#00f2d4" } as CSSProperties}
      >
        <div className="mc-bg" />
        <div className="mc-mesh" />
        <div className="mc-sheen" />
        <div className="mc-vignette" />
        <CornerBand />
        <CornerBand bottom />
        <div className="mc-border" />

        {side === "front" ? (
          <CardFront data={data} />
        ) : (
          <CardBack data={data} active={active} onQrClick={onQrClick} />
        )}
      </div>
    </div>
  );
}

function CornerBand({ bottom = false }: { bottom?: boolean }) {
  return (
    <div className={`mc-corner${bottom ? " is-bottom" : ""}`} aria-hidden="true">
      <div className="mc-band">
        <span className="mc-band-wedge" />
        <span className="mc-band-neon" />
        <span className="mc-band-line" />
        <span className="mc-band-chrome" />
        <span className="mc-band-edge" />
      </div>
    </div>
  );
}

function CardFront({ data }: { data: MemberCardData }) {
  return (
    <>
      <span className="mc-tier">{data.tierBadge}</span>

      <div className="mc-front-main">
        <div className="mc-brand-logo">
          <img
            src={withBasePath("/royal-sky-logo.png")}
            alt=""
            width={512}
            height={512}
            aria-hidden="true"
            draggable={false}
          />
        </div>

        <span className="mc-gym">GYM CLUB</span>
        <span className="mc-divider" />

        <div className="mc-identity">
          <span className="mc-hair" />
          <span className="mc-name">{data.nameUpper}</span>
          <span className="mc-meta">
            <span className="mc-cardno">{data.cardNumber}</span>
            <span className="mc-dot" />
            <span className="mc-plan">{data.planDisplay.toUpperCase()}</span>
          </span>
          <span className="mc-expiry">
            {data.isExpired
              ? "MASA AKTIF HABIS"
              : `BERLAKU S/D ${data.expiryLabel}`}
          </span>
        </div>
      </div>

      <div className="mc-footer">
        <div className="mc-slogan">
          STRONGER
          <br />
          HEALTHIER
          <br />
          BETTER YOU
          <span className="mc-slogan-line" />
        </div>
        <span className="mc-footer-spacer" />
        <span className="mc-footer-divider" />
        <div className="mc-bank">
          <span className="mc-supported">SUPPORTED BY</span>
          <span className="mc-bank-row">
            <BankBjbMark width={22} height={17} />
            <span className="mc-bank-word">
              bank <b>bjb</b>
            </span>
          </span>
          <span className="mc-kcp">KCP BANTEN</span>
        </div>
      </div>
    </>
  );
}

function CardBack({
  data,
  active,
  onQrClick,
}: {
  data: MemberCardData;
  active: boolean;
  onQrClick?: () => void;
}) {
  const statusLabel = data.isExpired
    ? "EXPIRED"
    : data.isFrozen
      ? "FROZEN"
      : "AKTIF";

  const qrMarkup = <QRCodeSVG value={data.qrData} size={128} level="M" bgColor="#ffffff" fgColor="#05080b" marginSize={0} />;

  return (
    <>
      <div className="mc-strip">
        <span>ROYAL SKY • MEMBER</span>
      </div>

      <div className="mc-back-head">
        <CrownMark width={34} height={23} />
        <div className="mc-back-headtext">
          <span className="mc-back-title">ROYAL SKY</span>
          <span className="mc-back-sub">GYM CLUB • DIGITAL MEMBER PASS</span>
        </div>
        <span className={`mc-status-dot${active ? " is-active" : " is-off"}`} />
      </div>

      <div className="mc-qr-block">
        {data.isLimited ? (
          <div className="mc-qr-shell mc-qr-shell-limited">
            <div className="mc-qr-box mc-qr-locked">
              <Icon name="lock" size={42} />
              <span>QR AKSES TERKUNCI</span>
              <small>Login PIN untuk membuka</small>
            </div>
          </div>
        ) : (
          <div className="mc-qr-shell">
            {data.hasGateQr ? (
              onQrClick ? (
                <button
                  type="button"
                  className={`mc-qr-box${active ? "" : " is-inactive"}`}
                  onClick={onQrClick}
                  aria-label="Perbesar QR akses pintu"
                >
                  {qrMarkup}
                  <span className="mc-zoom-badge">
                    <Icon name="qr" size={11} />
                  </span>
                </button>
              ) : (
                <div className={`mc-qr-box${active ? "" : " is-inactive"}`}>
                  {qrMarkup}
                </div>
              )
            ) : (
              <div className="mc-qr-box mc-qr-empty">
                <Icon name="qr" size={46} />
                <span>QR BELUM TERSEDIA</span>
              </div>
            )}

            {data.hasGateQr && !active && (
              <span className="mc-qr-blocked">
                {data.isFrozen ? "KARTU DIBEKUKAN" : "KARTU TIDAK AKTIF"}
              </span>
            )}
          </div>
        )}
        <span className="mc-back-cardno">{data.cardNumber}</span>
      </div>

      <div className="mc-details">
        <DetailCell label="NAMA MEMBER" value={data.nameUpper} full />
        <DetailCell label="NO. ANGGOTA" value={data.cardNumber} mono />
        <DetailCell label="PAKET" value={data.planDisplay} />
        <DetailCell
          label="STATUS"
          value={statusLabel}
          tone={data.isExpired ? "danger" : data.isFrozen ? "amber" : "cyan"}
        />
        <DetailCell label="BERLAKU S/D" value={data.expiryLabel} />
        {data.isLimited ? (
          <DetailCell label="AKSES" value="TERBATAS" tone="amber" />
        ) : (
          <DetailCell label="SALDO WALLET" value={data.walletLabel} tone="cyan" />
        )}
        <DetailCell label="POIN LOYALTY" value={data.pointsLabel} />
        <DetailCell label="FASILITAS" value={data.facility.toUpperCase()} />
        <DetailCell label="TERDAFTAR" value={data.joinedLabel} />
      </div>

      <div className="mc-back-footer">
        <span className="mc-back-footer-line" />
        <div className="mc-back-footer-row">
          <div className="mc-warning">
            <strong>KARTU INI TIDAK UNTUK DIPINDAHTANGANKAN</strong>
            <span>Tunjukkan kartu ini kepada petugas bila diminta.</span>
          </div>
          <div className="mc-back-bank">
            <span className="mc-back-bank-row">
              <BankBjbMark width={17} height={13} />
              <b>bank bjb</b>
            </span>
            <span className="mc-kcp">KCP BANTEN</span>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailCell({
  label,
  value,
  mono = false,
  full = false,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
  tone?: "cyan" | "danger" | "amber";
}) {
  return (
    <span className={`mc-cell${full ? " is-full" : ""}`}>
      <span className="mc-cell-label">{label}</span>
      <span
        className={`mc-cell-value${mono ? " is-mono" : ""}`}
        data-tone={tone}
      >
        {value}
      </span>
    </span>
  );
}
