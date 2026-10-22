import type { MemberCardData } from "./types";

/**
 * Fictional member used by the login hero and the `/preview` route. Keeping it
 * in one place means the design can be reviewed without touching live data.
 *
 * This module is imported by client components, so it intentionally does not
 * depend on the server-side member/API loader.
 */
export const demoMember: MemberCardData = {
  id: "912",
  name: "Dimas Setiawan",
  code: "MBR-8FA21C30",
  tier: "VIP",
  planLabel: "VIP PT 12 Bulan",
  status: "active",
  joinedAt: "2025-12-31T09:00:00+07:00",
  expiresAt: "2026-12-31",
  phone: "0812 3456 7890",
  email: "dimas.setiawan@example.com",
  facility: "Gym, Sauna, Cafe",
  wallet: 450_000,
  points: 1_250,
  ptTotal: 12,
  ptUsed: 4,
  avatarUrl: null,
  gateCode: "GATE-9F2A-8FA21C30",
  gatePayload: "RGC1.9F2A-DEMO-8FA21C30",
  gateStatus: "active",
  gateActive: true,
  gateLoaded: true,

  statusLabel: "VIP ACTIVE MEMBER",
  tierBadge: "VIP",
  nameUpper: "DIMAS SETIAWAN",
  cardNumber: "MBR-8FA21C30",
  expiryLabel: "31 DES 2026",
  joinedLabel: "31 Des 2025",
  walletLabel: "Rp 450.000",
  pointsLabel: "1.250 PTS",
  planDisplay: "VIP PT 12 Bulan",
  qrData: "RGC1.9F2A-DEMO-8FA21C30",
  hasGateQr: true,
  isExpired: false,
  isFrozen: false,
  isActive: true,
  isLimited: false,
  daysRemaining: 70,

  membershipId: "712",
  memberships: [
    {
      id: "712",
      memberName: "Dimas Setiawan",
      packageName: "VIP PT 12 Bulan",
      startAt: "2026-10-01",
      endAt: "2026-12-31",
      status: "active",
      ptRemaining: 8,
    },
    {
      id: "588",
      memberName: "Dimas Setiawan",
      packageName: "Membership 6 Bulan",
      startAt: "2026-04-01",
      endAt: "2026-09-30",
      status: "expired",
      ptRemaining: 0,
    },
    {
      id: "401",
      memberName: "Dimas Setiawan",
      packageName: "Membership 1 Bulan",
      startAt: "2026-03-01",
      endAt: "2026-03-31",
      status: "expired",
      ptRemaining: 0,
    },
  ],
  attendance: {
    memberName: "Dimas Setiawan",
    totalVisits: 148,
    visitsThisMonth: 12,
    lastVisit: "2026-10-21T18:40:00+07:00",
    ptSessionsUsed: 4,
    ptSessionsRemaining: 8,
  },
  lastUsedAt: "2026-10-21T18:40:00+07:00",
};
