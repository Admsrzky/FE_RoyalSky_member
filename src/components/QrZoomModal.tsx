"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { Icon } from "./icons";

type QrZoomModalProps = {
  data: string;
  memberName: string;
  cardNumber: string;
  active: boolean;
  onClose: () => void;
};

export function QrZoomModal({
  data,
  memberName,
  cardNumber,
  active,
  onClose,
}: QrZoomModalProps) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="qr-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="qr-modal">
        <div className="qr-modal-head">
          <span className="qr-modal-icon">
            <Icon name="qr" size={20} />
          </span>
          <div className="qr-modal-heading">
            <span className="eyebrow">Akses pintu</span>
            <h2 id="qr-modal-title">QR AKSES PINTU</h2>
            <p>{memberName}</p>
          </div>
          <button
            type="button"
            className="icon-btn qr-modal-close"
            onClick={onClose}
            aria-label="Tutup QR"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className={`qr-status${active ? "" : " is-off"}`}>
          <span className="status-dot" />
          {active ? "QR AKTIF" : "KARTU TIDAK AKTIF"}
        </div>

        <button
          type="button"
          className={`qr-code${zoomed ? " is-zoomed" : ""}${active ? "" : " is-off"}`}
          onClick={() => setZoomed((value) => !value)}
          aria-label={zoomed ? "Perkecil QR" : "Perbesar QR"}
        >
          <QRCodeSVG
            value={data}
            size={300}
            level="M"
            bgColor="#ffffff"
            fgColor="#05080b"
            marginSize={0}
          />
        </button>

        <p className="qr-hint">
          {zoomed
            ? "Klik QR untuk memperkecil."
            : "Klik QR untuk memperbesar sebelum dipindai."}
        </p>
        <span className="qr-cardno">{cardNumber}</span>

        <button type="button" className="btn-primary qr-close-btn" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}
