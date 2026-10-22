"use client";

import Link from "next/link";
import { useId } from "react";

type MarkProps = {
  width?: number;
  height?: number;
  className?: string;
};

export function CrownMark({
  width = 84,
  height = 56,
  className,
}: MarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const chrome = `crown-chrome-${uid}`;
  const shine = `crown-shine-${uid}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 65"
      fill="none"
      className={className ? `crown ${className}` : "crown"}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={chrome}
          x1="0"
          y1="0"
          x2="100"
          y2="65"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.25" stopColor="#e2e8f0" />
          <stop offset="0.45" stopColor="#64748b" />
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="0.75" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id={shine}
          x1="50"
          y1="10"
          x2="50"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#94a3b8" stopOpacity="0.2" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <ellipse
        cx="50"
        cy="53"
        rx="30"
        ry="2"
        fill="#0f172a"
        fillOpacity="0.72"
      />

      <path
        d="M18 52c17 4 47 4 64 0-3-4-61-4-64 0Z"
        fill={`url(#${chrome})`}
        stroke="#ffffff"
        strokeOpacity="0.8"
        strokeWidth="0.8"
      />

      <path
        d="M18 50 10 26c1-1 4 0 6 3l12 15 12-26c3 0 5 2 6 4l4-8 4 8c1-2 3-4 6-4l12 26 12-15c2-3 5-4 6-3l-8 24Z"
        fill={`url(#${chrome})`}
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      <path
        d="M18 50 10 26c1-1 4 0 6 3l12 15 12-26c3 0 5 2 6 4l4-8 4 8c1-2 3-4 6-4l12 26 12-15c2-3 5-4 6-3l-8 24Z"
        fill="none"
        stroke={`url(#${shine})`}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      <circle cx="10" cy="24" r="3.2" fill={`url(#${chrome})`} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="0.7" />
      <circle cx="30" cy="20" r="2.8" fill={`url(#${chrome})`} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="0.7" />
      <circle cx="50" cy="12" r="4.2" fill={`url(#${chrome})`} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="0.7" />
      <circle cx="70" cy="20" r="2.8" fill={`url(#${chrome})`} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="0.7" />
      <circle cx="90" cy="24" r="3.2" fill={`url(#${chrome})`} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="0.7" />

      <path d="M50 16 48 48" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="0.8" />
      <path d="M50 16 52 48" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="0.8" />
      <path d="M30 22 36 49" stroke="#334155" strokeWidth="0.9" />
      <path d="M70 22 64 49" stroke="#334155" strokeWidth="0.9" />
    </svg>
  );
}

export function BankBjbMark({ width = 22, height = 17, className }: MarkProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 28 22"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1 5c10 1 21-1 25-3-3 5-15 7-25 4Z"
        fill="#00a3e0"
      />
      <path
        d="M2 11c10 1 21-1 25-3-3 5-15 7-25 4Z"
        fill="#ffc72c"
      />
      <path
        d="M3 17c10 1 21-1 25-3-3 5-15 7-25 4Z"
        fill="#ed8b00"
      />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Royal Sky Gym Club">
      <span className="brand-mark">
        <CrownMark width={25} height={19} />
      </span>
      <span className="brand-text">
        <span className="brand-title">ROYAL SKY</span>
        {!compact && <span className="brand-sub">GYM CLUB</span>}
      </span>
    </Link>
  );
}
