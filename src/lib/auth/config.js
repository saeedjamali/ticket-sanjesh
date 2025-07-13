export const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
  ACCESS_TOKEN_EXPIRY: "15m", // 15 minutes
  REFRESH_TOKEN_EXPIRY: "7d", // 7 days
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
  PUBLIC_PATHS: [
    "/",
    "/login",
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/error",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/validate-token",
    "/test-login",
    "/api/direct-login",
  ],
  PUBLIC_PREFIXES: [
    "/auth/",
    "/_next/",
    "/favicon.ico",
    "/images/",
    "/assets/",
  ],
};

export const ROLES = {
  SYSTEM_ADMIN: "systemAdmin",
  GENERAL_MANAGER: "generalManager",
  PROVINCE_EDUCATION_EXPERT: "provinceEducationExpert",
  PROVINCE_TECH_EXPERT: "provinceTechExpert",
  PROVINCE_EVAL_EXPERT: "provinceEvalExpert",
  PROVINCE_REGISTRATION_EXPERT: "provinceRegistrationExpert",
  DISTRICT_EDUCATION_EXPERT: "districtEducationExpert",
  DISTRICT_TECH_EXPERT: "districtTechExpert",
  DISTRICT_EVAL_EXPERT: "districtEvalExpert",
  DISTRICT_REGISTRATION_EXPERT: "districtRegistrationExpert",
  EXAM_CENTER_MANAGER: "examCenterManager",
};

export const ROLE_PERMISSIONS = {
  [ROLES.SYSTEM_ADMIN]: ["*"], // All permissions
  [ROLES.GENERAL_MANAGER]: [
    "view_all_tickets",
    "manage_users",
    "manage_academic_years",
  ],
  [ROLES.PROVINCE_EDUCATION_EXPERT]: [
    "view_province_tickets",
    "manage_province_users",
  ],
  [ROLES.PROVINCE_EVAL_EXPERT]: [
    "view_province_tickets",
    "manage_province_users",
  ],
  [ROLES.PROVINCE_TECH_EXPERT]: [
    "view_province_tickets",
    "manage_province_technical",
  ],
  [ROLES.DISTRICT_EDUCATION_EXPERT]: [
    "view_district_tickets",
    "manage_district_users",
  ],
  [ROLES.DISTRICT_EVAL_EXPERT]: [
    "view_district_tickets",
    "manage_district_users",
  ],
  [ROLES.DISTRICT_TECH_EXPERT]: [
    "view_district_tickets",
    "manage_district_technical",
  ],
  [ROLES.EXAM_CENTER_MANAGER]: ["view_center_tickets", "manage_center_users"],
};
