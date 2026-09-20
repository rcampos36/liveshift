import type {
  CompanyRole,
  LocationRole,
  MembershipStatus,
  PlatformRole,
} from "@/generated/prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  platformRole: PlatformRole | null;
  emailVerifiedAt: Date | null;
  companyMemberships: Array<{
    id: string;
    companyId: string;
    role: CompanyRole;
    status: MembershipStatus;
    company: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  locationMemberships: Array<{
    id: string;
    locationId: string;
    role: LocationRole;
    status: MembershipStatus;
    location: {
      id: string;
      name: string;
      slug: string;
      companyId: string;
      company: {
        id: string;
        name: string;
        slug: string;
      };
    };
  }>;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  platformRole: PlatformRole | null;
  sid: string;
};

export const AUTH_COOKIE = {
  access: "liveshift_access",
  refresh: "liveshift_refresh",
} as const;
