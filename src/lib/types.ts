export type SessionUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  homeBranchId: number;
  roles: string[];
  posAreas: string[];
  permissions: string[];
  createdAt: string;
  /** `pinless` sessions are read-only and never hold a member API token. */
  access: "pin" | "pinless";
};

export type Session = {
  token: string;
  user: SessionUser;
};

export type GateCardInfo = {
  id: string;
  code: string;
  qrPayload: string;
  status: string;
  statusLabel: string;
  isValid: boolean;
  memberName: string;
  memberCode: string;
  packageName: string;
  membershipId: string;
  validFrom: string;
  validUntil: string;
  daysRemaining: number | null;
  useCount: number;
  lastUsedAt: string;
  cardUrl: string;
};

export type MembershipInfo = {
  id: string;
  memberName: string;
  packageName: string;
  startAt: string;
  endAt: string;
  status: string;
  ptRemaining: number;
};

export type AttendanceInfo = {
  memberName: string;
  totalVisits: number;
  visitsThisMonth: number;
  lastVisit: string;
  ptSessionsUsed: number;
  ptSessionsRemaining: number;
};

export type MemberCardData = {
  id: string;
  name: string;
  code: string;
  tier: string;
  planLabel: string;
  status: string;
  joinedAt: string;
  expiresAt: string;
  phone: string;
  email: string;
  facility: string;
  wallet: number;
  points: number;
  ptTotal: number;
  ptUsed: number;
  avatarUrl: string | null;
  gateCode: string;
  gatePayload: string;
  gateStatus: string;
  gateActive: boolean;
  gateLoaded: boolean;

  // Derived, ready to render.
  statusLabel: string;
  tierBadge: string;
  nameUpper: string;
  cardNumber: string;
  expiryLabel: string;
  joinedLabel: string;
  walletLabel: string;
  pointsLabel: string;
  planDisplay: string;
  qrData: string;
  hasGateQr: boolean;
  isExpired: boolean;
  isFrozen: boolean;
  isActive: boolean;
  isLimited: boolean;
  daysRemaining: number | null;

  // Extra context for the portal.
  membershipId: string;
  memberships: MembershipInfo[];
  attendance: AttendanceInfo | null;
  lastUsedAt: string;
};

export type MemberPayload = {
  member: MemberCardData;
};
