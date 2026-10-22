import { buildMemberCard } from "./member";

/**
 * Fictional member used by the login hero and the `/preview` route. Keeping it
 * in one place means the design can be reviewed without touching live data.
 */
export const demoMember = buildMemberCard(
  {
    id: 912,
    member_code: "MBR-8FA21C30",
    name: "Dimas Setiawan",
    email: "dimas.setiawan@example.com",
    phone: "0812 3456 7890",
    home_branch_id: 1,
    points_balance: 1_250,
    created_at: "2025-12-31T09:00:00+07:00",
    facility: "Gym, Sauna, Cafe",
    membership: {
      id: 712,
      package_name: "VIP PT 12 Bulan",
      status: "active",
      start_date: "2026-10-01",
      end_date: "2026-12-31",
      session_remaining: 8,
    },
  },
  {
    wallet: 450_000,
    ptTotal: 12,
    ptUsed: 4,
    gateCode: "GATE-9F2A-8FA21C30",
    gatePayload: "RGC1.9F2A-DEMO-8FA21C30",
    gateStatus: "active",
    gateActive: true,
    gateLoaded: true,
    membershipId: "712",
    lastUsedAt: "2026-10-21T18:40:00+07:00",
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
  },
);
