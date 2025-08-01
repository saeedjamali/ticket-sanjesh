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
  PROVINCE_EVAL_EXPERT: "provinceEvalExpert",
  PROVINCE_REGISTRATION_EXPERT: "provinceRegistrationExpert",
  DISTRICT_EDUCATION_EXPERT: "districtEducationExpert",
  DISTRICT_TECH_EXPERT: "districtTechExpert",
  DISTRICT_EVAL_EXPERT: "districtEvalExpert",
  DISTRICT_REGISTRATION_EXPERT: "districtRegistrationExpert",
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
    canCreateForms: false,
    canManageForms: false,
    canSubmitForms: false,
    // دسترسی‌های جدید برای مدیریت دانش‌آموزان
    canViewProvinceStudents: false,
    canViewDistrictStudents: false,
    canViewExamCenterStudents: false,
    canManageProvinceStudents: false,
    canManageDistrictStudents: false,
    canManageExamCenterStudents: false,
    canViewProvinceExamCenterStats: false,
    canViewDistrictExamCenterStats: false,
    canManageProvinceExamCenterStats: false,
    canManageDistrictExamCenterStats: false,
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
      permissions.canCreateForms = true;
      permissions.canManageForms = true;
      permissions.canSubmitForms = true;
      break;

    case ROLES.GENERAL_MANAGER:
      permissions.canViewProvinceTickets = true;
      permissions.canRespondToTickets = true;
      permissions.canViewProvinceDistricts = true;
      permissions.canViewProvinceExamCenters = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canCreateAnnouncements = true;
      permissions.canManageAnnouncements = true;
      permissions.canCreateForms = true;
      permissions.canManageForms = true;
      permissions.canSubmitForms = true;
      break;

    case ROLES.PROVINCE_EDUCATION_EXPERT:
      permissions.canViewProvinceTickets = true;
      permissions.canViewProvinceDistricts = true;
      permissions.canViewProvinceExamCenters = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canCreateAnnouncements = true;
      permissions.canManageAnnouncements = true;
      permissions.canCreateForms = true;
      permissions.canManageForms = true;
      permissions.canSubmitForms = true;
      break;

    case ROLES.PROVINCE_EVAL_EXPERT:
      permissions.canViewProvinceTickets = true;
      permissions.canViewProvinceDistricts = true;
      permissions.canViewProvinceExamCenters = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canCreateAnnouncements = true;
      permissions.canManageAnnouncements = true;
      permissions.canCreateForms = true;
      permissions.canManageForms = true;
      permissions.canSubmitForms = true;
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
      permissions.canCreateForms = true;
      permissions.canManageForms = true;
      permissions.canSubmitForms = true;
      break;

    case ROLES.DISTRICT_TECH_EXPERT:
      permissions.canManageExamCenters = true;
      permissions.canManageExamCenterManagers = true;
      permissions.canRespondToTickets = true;
      permissions.canViewDistrictTickets = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canSubmitForms = true;
      break;

    case ROLES.DISTRICT_EDUCATION_EXPERT:
      permissions.canRespondToTickets = true;
      permissions.canViewDistrictTickets = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canSubmitForms = true;
      break;

    case ROLES.DISTRICT_EVAL_EXPERT:
      permissions.canRespondToTickets = true;
      permissions.canViewDistrictTickets = true;
      permissions.canViewExamCenterTickets = true;
      permissions.canSubmitForms = true;
      break;

    case ROLES.PROVINCE_REGISTRATION_EXPERT:
      permissions.canViewProvinceTickets = true;
      permissions.canViewProvinceStudents = true;
      permissions.canManageProvinceStudents = true;
      permissions.canViewProvinceExamCenterStats = true;
      permissions.canManageProvinceExamCenterStats = true;
      permissions.canViewProvinceDistricts = true;
      permissions.canViewProvinceExamCenters = true;
      permissions.canCreateAnnouncements = true;
      permissions.canCreateForms = true;
      permissions.canSubmitForms = true;
      break;

    case ROLES.DISTRICT_REGISTRATION_EXPERT:
      permissions.canViewDistrictTickets = true;
      permissions.canViewDistrictStudents = true;
      permissions.canManageDistrictStudents = true;
      permissions.canViewDistrictExamCenterStats = true;
      permissions.canManageDistrictExamCenterStats = true;
      permissions.canCreateAnnouncements = true;
      permissions.canCreateForms = true;
      permissions.canSubmitForms = true;
      break;

    case ROLES.EXAM_CENTER_MANAGER:
      permissions.canCreateTickets = true;
      permissions.canViewExamCenterStudents = true;
      permissions.canManageExamCenterStudents = true;
      permissions.canSubmitForms = true;
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
    [ROLES.PROVINCE_EVAL_EXPERT]: "کارشناس ارزیابی استان",
    [ROLES.PROVINCE_REGISTRATION_EXPERT]: "کارشناس ثبت نام استان",
    [ROLES.DISTRICT_EDUCATION_EXPERT]: "کارشناس سنجش منطقه",
    [ROLES.DISTRICT_TECH_EXPERT]: "کارشناس فناوری منطقه",
    [ROLES.DISTRICT_EVAL_EXPERT]: "کارشناس ارزیابی منطقه",
    [ROLES.DISTRICT_REGISTRATION_EXPERT]: "کارشناس ثبت نام منطقه",
    [ROLES.EXAM_CENTER_MANAGER]: "مدیر واحد سازمانی",
  };

  return roleNames[role] || "کاربر";
}

export function getMenuItemsByRole(role, pendingFormsCount = 0) {
  const activeMenuItems = [];
  const disabledMenuItems = [];

  // داشبورد برای همه کاربران قابل دسترس است
  activeMenuItems.push({
    label: "داشبورد",
    path: "/dashboard",
    icon: "dashboard",
  });

  // منوی اطلاعیه‌ها - برای همه کاربران
  activeMenuItems.push({
    label: "اطلاعیه‌ها",
    path: "/dashboard/announcements",
    icon: "announcements",
  });

  // منوی دانش‌آموزان - برای مدیران واحد سازمانی و کارشناسان ثبت نام
  if (
    role === ROLES.EXAM_CENTER_MANAGER
    // ||
    // role === ROLES.PROVINCE_REGISTRATION_EXPERT ||
    // role === ROLES.DISTRICT_REGISTRATION_EXPERT
  ) {
    activeMenuItems.push({
      label: "لیست دانش آموزان",
      path: "/dashboard/students",
      icon: "studentInfo",
      submenu: [
        {
          label: "لیست دانش آموزان سال جاری",
          path: "/dashboard/students/current",
        },
        {
          label: "لیست دانش آموزان سال گذشته",
          path: "/dashboard/students/previous",
        },
        {
          label: "بازمانده از تحصیل",
          path: "/dashboard/students/dropouts",
          disabled: true,
        },
      ],
    });
  }

  // منوی گزارش ثبت نام دانش آموزی - فقط برای مدیر کل
  if (role === ROLES.GENERAL_MANAGER || role === ROLES.SYSTEM_ADMIN) {
    activeMenuItems.push({
      label: "گزارش ثبت نام دانش آموزی",
      path: "/dashboard/student-registration-reports",
      icon: "studentReports",
    });
  }

  // منوی گزارش وضعیت دانش آموزی - برای کارشناسان ثبت نام و مدیر کل
  if (
    role === ROLES.PROVINCE_REGISTRATION_EXPERT ||
    role === ROLES.DISTRICT_REGISTRATION_EXPERT ||
    role === ROLES.GENERAL_MANAGER ||
    role === ROLES.SYSTEM_ADMIN
  ) {
    activeMenuItems.push({
      label: "گزارش وضعیت دانش آموزی",
      path: "/dashboard/student-status-reports",
      icon: "statusReports",
    });
  }

  // منوی رویدادها - فقط برای مدیر سیستم
  if (role === ROLES.SYSTEM_ADMIN) {
    activeMenuItems.push({
      label: "مدیریت رویدادها",
      path: "/dashboard/events",
      icon: "events",
    });
  }

  // منوی پروفایل کاربری - برای همه کاربران

  // منوی کاربران - فقط برای مدیران ارشد
  if (
    role === ROLES.SYSTEM_ADMIN ||
    role === ROLES.GENERAL_MANAGER ||
    role === ROLES.PROVINCE_TECH_EXPERT ||
    role === ROLES.DISTRICT_TECH_EXPERT
  ) {
    activeMenuItems.push({
      label: "کاربران",
      path: "/dashboard/users",
      icon: "users",
    });
  }

  // منوی تنظیمات - فقط برای مدیران سیستم
  if (role === ROLES.SYSTEM_ADMIN) {
    activeMenuItems.push({
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
          label: "واحدهای سازمانی",
          path: "/dashboard/exam-centers",
        },
        {
          label: "دوره-شاخه-رشته",
          path: "/dashboard/course-branch-fields",
        },
        {
          label: "دوره-پایه",
          path: "/dashboard/course-grades",
        },
        {
          label: "جنسیت",
          path: "/dashboard/genders",
        },
        {
          label: "نوع واحد سازمانی",
          path: "/dashboard/organizational-unit-types",
        },
        {
          label: "آمار واحد سازمانی",
          path: "/dashboard/settings/exam-center-stats",
        },
        {
          label: "علت‌های بازمانده از تحصیل",
          path: "/dashboard/settings/dropout-reasons",
        },
      ],
    });
  }

  // منوی تیکت‌ها - برای همه کاربران
  if (
    role === ROLES.EXAM_CENTER_MANAGER ||
    role === ROLES.PROVINCE_REGISTRATION_EXPERT ||
    role === ROLES.DISTRICT_REGISTRATION_EXPERT
  ) {
    disabledMenuItems.push({
      label: "تیکت‌ها",
      path: "/dashboard/tickets",
      icon: "tickets",
      disabled: true,
    });
  } else {
    activeMenuItems.push({
      label: "تیکت‌ها",
      path: "/dashboard/tickets",
      icon: "tickets",
    });
  }

  // منوی فرم‌ها - برای کاربران مجاز
  if (
    role === ROLES.SYSTEM_ADMIN ||
    role === ROLES.GENERAL_MANAGER ||
    role === ROLES.PROVINCE_EDUCATION_EXPERT ||
    role === ROLES.PROVINCE_TECH_EXPERT ||
    role === ROLES.PROVINCE_EVAL_EXPERT ||
    role === ROLES.DISTRICT_EDUCATION_EXPERT ||
    role === ROLES.DISTRICT_TECH_EXPERT ||
    role === ROLES.DISTRICT_EVAL_EXPERT ||
    role === ROLES.EXAM_CENTER_MANAGER
  ) {
    const formsMenuItem = {
      label: "فرم‌ها",
      path: "/dashboard/forms",
      icon: "forms",
      disabled: role === ROLES.EXAM_CENTER_MANAGER,
    };

    // Add badge count for users who can submit forms (not managers)
    if (
      role === ROLES.DISTRICT_EDUCATION_EXPERT ||
      role === ROLES.DISTRICT_TECH_EXPERT ||
      role === ROLES.DISTRICT_EVAL_EXPERT ||
      role === ROLES.EXAM_CENTER_MANAGER
    ) {
      formsMenuItem.badge = pendingFormsCount;
    }

    if (role === ROLES.EXAM_CENTER_MANAGER) {
      disabledMenuItems.push(formsMenuItem);
    } else {
      activeMenuItems.push(formsMenuItem);
    }
  }

  // منوی گزارش‌های ارسالی - برای کاربران که می‌توانند فرم ارسال کنند
  if (
    role === ROLES.DISTRICT_EDUCATION_EXPERT ||
    role === ROLES.DISTRICT_TECH_EXPERT ||
    role === ROLES.DISTRICT_EVAL_EXPERT ||
    role === ROLES.EXAM_CENTER_MANAGER
  ) {
    const submissionsMenuItem = {
      label: "گزارش‌های ارسالی",
      path: "/dashboard/submissions",
      icon: "reports",
      disabled: role === ROLES.EXAM_CENTER_MANAGER,
    };

    if (role === ROLES.EXAM_CENTER_MANAGER) {
      disabledMenuItems.push(submissionsMenuItem);
    } else {
      activeMenuItems.push(submissionsMenuItem);
    }
  }

  // منوی درخواست‌های اصلاح آمار - برای کارشناسان ثبت نام منطقه و استان
  if (
    role === ROLES.DISTRICT_REGISTRATION_EXPERT ||
    role === ROLES.PROVINCE_REGISTRATION_EXPERT
  ) {
    activeMenuItems.push({
      label: "درخواست‌های اصلاح آمار",
      path: "/dashboard/correction-requests",
      icon: "edit",
    });
  }
  activeMenuItems.push({
    label: "پروفایل ",
    path: "/dashboard/profile",
    icon: "profile",
  });
  // ترکیب منوهای فعال و غیرفعال (غیرفعال‌ها در انتها)
  return [...activeMenuItems, ...disabledMenuItems];
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
