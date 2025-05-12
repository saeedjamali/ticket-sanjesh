import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { authService } from "./auth/authService";

export async function checkUserRole(allowedRoles, user) {
  // console.log("user---->", user);

  if (!user) {
    redirect("/auth/login");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect("/access-denied");
  }

  return user;
}

export const ROLES = {
  SYSTEM_ADMIN: "systemAdmin",
  GENERAL_MANAGER: "generalManager",
  PROVINCE_EDUCATION_EXPERT: "provinceEducationExpert",
  PROVINCE_TECH_EXPERT: "provinceTechExpert",
  DISTRICT_EDUCATION_EXPERT: "districtEducationExpert",
  DISTRICT_TECH_EXPERT: "districtTechExpert",
  EXAM_CENTER_MANAGER: "examCenterManager",
};

export function getRolePermissions(role) {
  const permissions = {
    canManageAcademicYears: false,
    canManageGeneralManagers: false,
    canManageProvinceExperts: false,
    canManageProvinces: false,
    canManageDistricts: false,
    canManageDistrictExperts: false,
    canManageExamCenters: false,
    canManageExamCenterManagers: false,
    canCreateTickets: false,
    canRespondToTickets: false,
    canViewDistrictTickets: false,
    canViewProvinceTickets: false,
    canViewAllTickets: false,
    canViewProvinceDistricts: false,
    canViewProvinceExamCenters: false,
    canViewExamCenterTickets: false,
    canCreateAnnouncements: false,
    canManageAnnouncements: false,
  };

  switch (role) {
    case ROLES.SYSTEM_ADMIN:
      permissions.canManageAcademicYears = true;
      permissions.canManageGeneralManagers = true;
      permissions.canManageProvinceExperts = true;
      permissions.canManageProvinces = true;
      permissions.canManageDistricts = true;
      permissions.canManageExamCenters = true;
      permissions.canManageExamCenterManagers = true;
      permissions.canViewAllTickets = true;
      permissions.canViewProvinceDistricts = true;
      permissions.canViewProvinceExamCenters = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canCreateAnnouncements = true;
      permissions.canManageAnnouncements = true;
      break;

    case ROLES.GENERAL_MANAGER:
      permissions.canViewProvinceTickets = true;
      permissions.canRespondToTickets = true;
      permissions.canViewProvinceDistricts = true;
      permissions.canViewProvinceExamCenters = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canCreateAnnouncements = true;
      permissions.canManageAnnouncements = true;
      break;

    case ROLES.PROVINCE_EDUCATION_EXPERT:
      permissions.canViewProvinceTickets = true;
      permissions.canViewProvinceDistricts = true;
      permissions.canViewProvinceExamCenters = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canCreateAnnouncements = true;
      permissions.canManageAnnouncements = true;
      break;

    case ROLES.PROVINCE_TECH_EXPERT:
      permissions.canManageDistrictExperts = true;
      permissions.canManageExamCenters = true;
      permissions.canManageExamCenterManagers = true;
      permissions.canViewProvinceTickets = true;
      permissions.canViewProvinceDistricts = true;
      permissions.canViewProvinceExamCenters = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canCreateAnnouncements = true;
      permissions.canManageAnnouncements = true;
      break;

    case ROLES.DISTRICT_TECH_EXPERT:
      permissions.canManageExamCenters = true;
      permissions.canManageExamCenterManagers = true;
      permissions.canRespondToTickets = true;
      permissions.canViewDistrictTickets = true;
      permissions.canViewExamCenterTickets = true;
      break;

    case ROLES.DISTRICT_EDUCATION_EXPERT:
      permissions.canRespondToTickets = true;
      permissions.canViewDistrictTickets = true;
      permissions.canViewExamCenterTickets = true;
      break;

    case ROLES.EXAM_CENTER_MANAGER:
      permissions.canCreateTickets = true;
      break;
  }

  return permissions;
}

export function getRoleName(role) {
  const roleNames = {
    [ROLES.SYSTEM_ADMIN]: "مدیر سیستم",
    [ROLES.GENERAL_MANAGER]: "مدیر کل",
    [ROLES.PROVINCE_EDUCATION_EXPERT]: "کارشناس سنجش استان",
    [ROLES.PROVINCE_TECH_EXPERT]: "کارشناس فناوری استان",
    [ROLES.DISTRICT_EDUCATION_EXPERT]: "کارشناس سنجش منطقه",
    [ROLES.DISTRICT_TECH_EXPERT]: "کارشناس فناوری منطقه",
    [ROLES.EXAM_CENTER_MANAGER]: "مسئول مرکز آزمون",
  };

  return roleNames[role] || "کاربر";
}

export function getMenuItemsByRole(role) {
  const menuItems = [];

  // داشبورد برای همه کاربران قابل دسترس است
  menuItems.push({
    label: "داشبورد",
    path: "/dashboard",
    icon: "dashboard",
  });

  // منوی تیکت‌ها - برای همه کاربران
  menuItems.push({
    label: "تیکت‌ها",
    path: "/dashboard/tickets",
    icon: "tickets",
  });

  // منوی اطلاعیه‌ها - برای همه کاربران
  menuItems.push({
    label: "اطلاعیه‌ها",
    path: "/dashboard/announcements",
    icon: "announcements",
  });

  // منوی پروفایل کاربری - برای همه کاربران
  menuItems.push({
    label: "پروفایل ",
    path: "/dashboard/profile",
    icon: "profile",
  });

  // منوی کاربران - فقط برای مدیران ارشد
  if (
    role === ROLES.SYSTEM_ADMIN ||
    role === ROLES.GENERAL_MANAGER ||
    role === ROLES.PROVINCE_TECH_EXPERT ||
    role === ROLES.DISTRICT_TECH_EXPERT
  ) {
    menuItems.push({
      label: "کاربران",
      path: "/dashboard/users",
      icon: "users",
    });
  }

  // // منوی گزارش‌ها - برای مدیران و کارشناسان
  // if (
  //   role === ROLES.SYSTEM_ADMIN ||
  //   role === ROLES.GENERAL_MANAGER ||
  //   role === ROLES.PROVINCE_EDUCATION_EXPERT ||
  //   role === ROLES.PROVINCE_TECH_EXPERT ||
  //   role === ROLES.DISTRICT_EDUCATION_EXPERT ||
  //   role === ROLES.DISTRICT_TECH_EXPERT
  // ) {
  //   menuItems.push({
  //     label: "گزارش‌ها",
  //     path: "/dashboard/reports",
  //     icon: "reports",
  //   });
  // }

  // منوی تنظیمات - فقط برای مدیران سیستم
  if (role === ROLES.SYSTEM_ADMIN) {
    menuItems.push({
      label: "تنظیمات",
      path: "/dashboard/settings",
      icon: "settings",
      submenu: [
        {
          label: "سال تحصیلی",
          path: "/dashboard/academic-years",
        },
        {
          label: "استان‌ها",
          path: "/dashboard/provinces",
        },
        {
          label: "مناطق",
          path: "/dashboard/districts",
        },
        {
          label: "مراکز آزمون",
          path: "/dashboard/exam-centers",
        },
      ],
    });
  }

  return menuItems;
}

export const getStatusText = (status) => {
  switch (status) {
    case "draft":
      return "پیش‌نویس";
    case "new":
      return "جدید";
    case "seen":
      return "دیده شده";
    case "inProgress":
      return "در حال بررسی";
    case "resolved":
      return "پاسخ داده شده";
    case "referred_province":
      return "ارجاع به استان";
    case "closed":
      return "بسته شده";
    default:
      return status;
  }
};
