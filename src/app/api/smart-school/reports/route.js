import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import SmartSchool from "@/models/SmartSchool";
import ExamCenter from "@/models/ExamCenter";
import District from "@/models/District";
import Province from "@/models/Province";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

export async function GET(req) {
  try {
    const user = await authService.validateToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }
    console.log("user---->", user);
    // بررسی دسترسی
    const allowedRoles = [
      ROLES.PROVINCE_TECH_EXPERT,
      ROLES.DISTRICT_TECH_EXPERT,
      "provinceTechExpert",
      "districtTechExpert",
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "شما مجاز به مشاهده گزارشات نیستید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "summary";

    let query = {};

    // محدودیت دسترسی براساس نقش کاربر
    if (
      user.role === ROLES.DISTRICT_TECH_EXPERT ||
      user.role === "districtTechExpert"
    ) {
      // برای کارشناس فنی منطقه، کد منطقه را از district object بگیریم
      if (user.district) {
        const district = await District.findById(user.district);
        if (district) {
          query.districtCode = district.code;
        }
      }
    } else if (
      user.role === ROLES.PROVINCE_TECH_EXPERT ||
      user.role === "provinceTechExpert"
    ) {
      // برای کارشناس فنی استان، کد استان را از province object بگیریم
      if (user.province) {
        const province = await Province.findById(user.province);
        if (province) {
          query.provinceCode = province.code;
        }
      }
    }

    const smartSchools = await SmartSchool.find(query);

    // دریافت نام مراکز برای گزارش‌های جزئی
    let examCenterNames = {};
    if (reportType === "detailed" || reportType === "improvements") {
      const centerCodes = [
        ...new Set(smartSchools.map((s) => s.examCenterCode)),
      ];
      const centers = await ExamCenter.find({
        code: { $in: centerCodes },
      }).select("code name");
      examCenterNames = centers.reduce((acc, center) => {
        acc[center.code] = center.name;
        return acc;
      }, {});
    }

    let reportData = {};

    switch (reportType) {
      case "summary":
        reportData = generateSummaryReport(smartSchools);
        break;
      case "detailed":
        reportData = generateDetailedReport(smartSchools, examCenterNames);
        break;
      case "comparison":
        reportData = generateComparisonReport(smartSchools);
        break;
      case "improvements":
        reportData = generateImprovementsReport(smartSchools, examCenterNames);
        break;
      default:
        reportData = generateSummaryReport(smartSchools);
    }

    return NextResponse.json({
      success: true,
      data: reportData,
      totalCount: smartSchools.length,
    });
  } catch (error) {
    console.error("Error generating smart school reports:", error);
    return NextResponse.json(
      { success: false, error: "خطا در تولید گزارش" },
      { status: 500 }
    );
  }
}

function generateSummaryReport(smartSchools) {
  const total = smartSchools.length;

  if (total === 0) {
    return {
      overview: {
        total: 0,
        averageScore: 0,
        levels: { ابتدایی: 0, مقدماتی: 0, متوسط: 0, پیشرفته: 0 },
      },
      infrastructure: {},
      equipment: {},
      software: {},
      skills: {},
    };
  }

  const averageScore =
    smartSchools.reduce((sum, school) => sum + school.smartSchoolScore, 0) /
    total;

  // تقسیم‌بندی بر اساس سطح
  const levels = {
    ابتدایی: smartSchools.filter((s) => s.smartSchoolScore < 40).length,
    مقدماتی: smartSchools.filter(
      (s) => s.smartSchoolScore >= 40 && s.smartSchoolScore < 60
    ).length,
    متوسط: smartSchools.filter(
      (s) => s.smartSchoolScore >= 60 && s.smartSchoolScore < 80
    ).length,
    پیشرفته: smartSchools.filter((s) => s.smartSchoolScore >= 80).length,
  };

  // آمار زیرساخت اینترنت
  const internetStats = {
    ندارد: smartSchools.filter((s) => s.internetConnection === "ندارد").length,
    ADSL: smartSchools.filter((s) => s.internetConnection === "ADSL").length,
    "فیبر نوری": smartSchools.filter(
      (s) => s.internetConnection === "فیبر نوری"
    ).length,
    "4G/5G": smartSchools.filter((s) => s.internetConnection === "4G/5G")
      .length,
  };

  const wifiAvailable = smartSchools.filter((s) => s.wifiAvailable).length;

  // آمار کیفیت وای‌فای (حالا string است)
  const wifiCoverageStats = {
    ضعیف: smartSchools.filter((s) => s.wifiCoverage === "ضعیف").length,
    مناسب: smartSchools.filter((s) => s.wifiCoverage === "مناسب").length,
    خوب: smartSchools.filter((s) => s.wifiCoverage === "خوب").length,
    عالی: smartSchools.filter((s) => s.wifiCoverage === "عالی").length,
  };

  // آمار تجهیزات
  const equipmentStats = {
    totalComputers: smartSchools.reduce((sum, s) => sum + s.computerCount, 0),
    totalLaptops: smartSchools.reduce((sum, s) => sum + s.laptopCount, 0),
    totalTablets: smartSchools.reduce((sum, s) => sum + s.tabletCount, 0),
    totalSmartBoards: smartSchools.reduce(
      (sum, s) => sum + s.smartBoardCount,
      0
    ),
    totalProjectors: smartSchools.reduce((sum, s) => sum + s.projectorCount, 0),
    averageComputersPerSchool:
      smartSchools.reduce((sum, s) => sum + s.computerCount, 0) / total,
    averageLaptopsPerSchool:
      smartSchools.reduce((sum, s) => sum + s.laptopCount, 0) / total,
  };

  // آمار نرم‌افزار (فقط آنتی‌ویروس باقی مانده)
  const softwareStats = {
    hasManagementSoftware: smartSchools.filter(
      (s) => s.managementSoftware !== "ندارد"
    ).length,
    hasAntivirus: smartSchools.filter((s) => s.antivirusSoftware).length,
  };

  // آمار مهارت
  const skillStats = {
    teacherSkills: {
      مبتدی: smartSchools.filter((s) => s.teacherITSkillLevel === "مبتدی")
        .length,
      متوسط: smartSchools.filter((s) => s.teacherITSkillLevel === "متوسط")
        .length,
      پیشرفته: smartSchools.filter((s) => s.teacherITSkillLevel === "پیشرفته")
        .length,
      خبره: smartSchools.filter((s) => s.teacherITSkillLevel === "خبره").length,
    },
    studentSkills: {
      مبتدی: smartSchools.filter((s) => s.studentITSkillLevel === "مبتدی")
        .length,
      متوسط: smartSchools.filter((s) => s.studentITSkillLevel === "متوسط")
        .length,
      پیشرفته: smartSchools.filter((s) => s.studentITSkillLevel === "پیشرفته")
        .length,
      خبره: smartSchools.filter((s) => s.studentITSkillLevel === "خبره").length,
    },
  };

  // خدمات آنلاین
  const onlineServices = {
    onlineClasses: smartSchools.filter((s) => s.onlineClassesCapability).length,
    elearning: smartSchools.filter((s) => s.elearningPlatform).length,
    digitalLibrary: smartSchools.filter((s) => s.digitalLibrary).length,
    onlineExams: smartSchools.filter((s) => s.onlineExamSystem).length,
  };

  // آمار کلاس‌ها
  const classroomStats = {
    totalClassrooms: smartSchools.reduce(
      (sum, s) => sum + (s.totalClassrooms || 0),
      0
    ),
    totalSmartClassrooms: smartSchools.reduce(
      (sum, s) => sum + (s.smartClassrooms || 0),
      0
    ),
    averageClassroomsPerSchool:
      total > 0
        ? Math.round(
            (smartSchools.reduce(
              (sum, s) => sum + (s.totalClassrooms || 0),
              0
            ) /
              total) *
              10
          ) / 10
        : 0,
    averageSmartClassroomsPerSchool:
      total > 0
        ? Math.round(
            (smartSchools.reduce(
              (sum, s) => sum + (s.smartClassrooms || 0),
              0
            ) /
              total) *
              10
          ) / 10
        : 0,
    schoolsWithSmartClassrooms: smartSchools.filter(
      (s) => (s.smartClassrooms || 0) > 0
    ).length,
    averageSmartClassroomPercentage:
      total > 0
        ? Math.round(
            (smartSchools.reduce((sum, s) => {
              if (s.totalClassrooms > 0) {
                return (
                  sum + ((s.smartClassrooms || 0) / s.totalClassrooms) * 100
                );
              }
              return sum;
            }, 0) /
              total) *
              10
          ) / 10
        : 0,
  };

  return {
    overview: {
      total,
      averageScore: Math.round(averageScore * 100) / 100,
      levels,
    },
    infrastructure: {
      internet: internetStats,
      wifi: {
        available: wifiAvailable,
        coverage: wifiCoverageStats,
      },
    },
    equipment: equipmentStats,
    software: softwareStats,
    skills: skillStats,
    onlineServices,
    classrooms: classroomStats,
  };
}

function generateDetailedReport(smartSchools, examCenterNames = {}) {
  return smartSchools.map((school) => ({
    examCenterCode: school.examCenterCode,
    examCenterName:
      examCenterNames[school.examCenterCode] || "نام مرکز یافت نشد",
    districtCode: school.districtCode,
    provinceCode: school.provinceCode,
    smartSchoolScore: school.smartSchoolScore,
    level: getSchoolLevel(school.smartSchoolScore),
    infrastructure: {
      internetConnection: school.internetConnection,
      internetSpeed: school.internetSpeed,
      wifiAvailable: school.wifiAvailable,
      wifiCoverage: school.wifiCoverage,
    },
    equipment: {
      computers: school.computerCount,
      laptops: school.laptopCount,
      tablets: school.tabletCount,
      smartBoards: school.smartBoardCount,
      projectors: school.projectorCount,
    },
    software: {
      managementSoftware: school.managementSoftware,
      managementSoftwareUrl: school.managementSoftwareUrl,
      managementSoftwareSatisfaction: school.managementSoftwareSatisfaction,
      hasAntivirus: school.antivirusSoftware,
      antivirusSoftwareName: school.antivirusSoftwareName,
    },
    classrooms: {
      totalClassrooms: school.totalClassrooms,
      smartClassrooms: school.smartClassrooms,
      smartClassroomPercentage:
        school.totalClassrooms > 0
          ? Math.round((school.smartClassrooms / school.totalClassrooms) * 100)
          : 0,
    },
    skills: {
      teacherLevel: school.teacherITSkillLevel,
      studentLevel: school.studentITSkillLevel,
      hasITTrainingProgram: school.itTrainingProgram,
      technicalStaffCode: school.technicalStaffCode,
      technicalStaffFirstName: school.technicalStaffFirstName,
      technicalStaffLastName: school.technicalStaffLastName,
      technicalStaffPhone: school.technicalStaffPhone,
      technicalStaffSkills: school.technicalStaffSkills,
    },
    onlineServices: {
      onlineClasses: school.onlineClassesCapability,
      onlineClassesUrl: school.onlineClassesUrl,
      elearning: school.elearningPlatform,
      elearningPlatformUrl: school.elearningPlatformUrl,
      digitalLibrary: school.digitalLibrary,
      digitalLibraryUrl: school.digitalLibraryUrl,
      onlineExams: school.onlineExamSystem,
      onlineExamSystemUrl: school.onlineExamSystemUrl,
    },
    improvementPriorities: school.improvementPriorities,
    lastUpdate: school.lastUpdate,
  }));
}

function generateComparisonReport(smartSchools) {
  const schoolsByLevel = {
    ابتدایی: smartSchools.filter((s) => s.smartSchoolScore < 40),
    مقدماتی: smartSchools.filter(
      (s) => s.smartSchoolScore >= 40 && s.smartSchoolScore < 60
    ),
    متوسط: smartSchools.filter(
      (s) => s.smartSchoolScore >= 60 && s.smartSchoolScore < 80
    ),
    پیشرفته: smartSchools.filter((s) => s.smartSchoolScore >= 80),
  };

  const comparison = {};

  Object.keys(schoolsByLevel).forEach((level) => {
    const schools = schoolsByLevel[level];
    if (schools.length > 0) {
      comparison[level] = {
        count: schools.length,
        averageScore:
          schools.reduce((sum, s) => sum + s.smartSchoolScore, 0) /
          schools.length,
        averageEquipment: {
          computers:
            schools.reduce((sum, s) => sum + s.computerCount, 0) /
            schools.length,
          laptops:
            schools.reduce((sum, s) => sum + s.laptopCount, 0) / schools.length,
          smartBoards:
            schools.reduce((sum, s) => sum + s.smartBoardCount, 0) /
            schools.length,
        },
        internetTypes: {
          فیبر: schools.filter((s) => s.internetConnection === "فیبر نوری")
            .length,
          ADSL: schools.filter((s) => s.internetConnection === "ADSL").length,
          ندارد: schools.filter((s) => s.internetConnection === "ندارد").length,
        },
      };
    } else {
      comparison[level] = {
        count: 0,
        averageScore: 0,
        averageEquipment: { computers: 0, laptops: 0, smartBoards: 0 },
        internetTypes: { فیبر: 0, ADSL: 0, ندارد: 0 },
      };
    }
  });

  return comparison;
}

function generateImprovementsReport(smartSchools, examCenterNames = {}) {
  const priorityCounts = {};
  const schoolsNeedingImprovement = smartSchools.filter(
    (s) => s.smartSchoolScore < 80
  );

  schoolsNeedingImprovement.forEach((school) => {
    school.improvementPriorities.forEach((priority) => {
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });
  });

  const sortedPriorities = Object.entries(priorityCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([priority, count]) => ({
      priority,
      count,
      percentage: Math.round((count / schoolsNeedingImprovement.length) * 100),
    }));

  return {
    totalSchoolsNeedingImprovement: schoolsNeedingImprovement.length,
    prioritizedImprovements: sortedPriorities,
    schoolsByPriority: schoolsNeedingImprovement.map((school) => ({
      examCenterCode: school.examCenterCode,
      examCenterName:
        examCenterNames[school.examCenterCode] || "نام مرکز یافت نشد",
      score: school.smartSchoolScore,
      priorities: school.improvementPriorities,
      totalClassrooms: school.totalClassrooms,
      smartClassrooms: school.smartClassrooms,
      smartClassroomPercentage:
        school.totalClassrooms > 0
          ? Math.round((school.smartClassrooms / school.totalClassrooms) * 100)
          : 0,
    })),
  };
}

function getSchoolLevel(score) {
  if (score >= 80) return "پیشرفته";
  if (score >= 60) return "متوسط";
  if (score >= 40) return "مقدماتی";
  return "ابتدایی";
}
