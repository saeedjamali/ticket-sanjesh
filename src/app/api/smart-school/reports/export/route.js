import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import SmartSchool from "@/models/SmartSchool";
import ExamCenter from "@/models/ExamCenter";
import District from "@/models/District";
import Province from "@/models/Province";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import * as XLSX from "xlsx";

export async function GET(req) {
  try {
    const user = await authService.validateToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    const allowedRoles = [
      ROLES.PROVINCE_TECH_EXPERT,
      ROLES.DISTRICT_TECH_EXPERT,
      "provinceTechExpert",
      "districtTechExpert",
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "شما مجاز به دانلود گزارشات نیستید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "detailed";

    let query = {};

    // محدودیت دسترسی براساس نقش کاربر
    if (
      user.role === ROLES.DISTRICT_TECH_EXPERT ||
      user.role === "districtTechExpert"
    ) {
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
      if (user.province) {
        const province = await Province.findById(user.province);
        if (province) {
          query.provinceCode = province.code;
        }
      }
    }

    const smartSchools = await SmartSchool.find(query);

    // دریافت نام مراکز
    const centerCodes = [...new Set(smartSchools.map((s) => s.examCenterCode))];
    const centers = await ExamCenter.find({
      code: { $in: centerCodes },
    }).select("code name");
    const examCenterNames = centers.reduce((acc, center) => {
      acc[center.code] = center.name;
      return acc;
    }, {});

    let excelData = [];
    let fileName = "smart-school-report";

    switch (reportType) {
      case "detailed":
        excelData = smartSchools.map((school) => ({
          "کد مرکز": school.examCenterCode,
          "نام مرکز":
            examCenterNames[school.examCenterCode] || "نام مرکز یافت نشد",
          امتیاز: school.smartSchoolScore,
          سطح: getSchoolLevel(school.smartSchoolScore),
          "تعداد کل کلاس": school.totalClassrooms,
          "تعداد کلاس هوشمند": school.smartClassrooms,
          "درصد کلاس هوشمند":
            school.totalClassrooms > 0
              ? Math.round(
                  (school.smartClassrooms / school.totalClassrooms) * 100
                )
              : 0,
          "نوع اینترنت": school.internetConnection,
          "سرعت اینترنت": school.internetSpeed,
          "واحد سرعت": school.internetSpeedUnit,
          وای‌فای: school.wifiAvailable ? "دارد" : "ندارد",
          "کیفیت وای‌فای": school.wifiCoverage || "-",
          "تعداد کامپیوتر": school.computerCount,
          "تعداد لپ‌تاپ": school.laptopCount,
          "تعداد تبلت": school.tabletCount,
          "تعداد تخته هوشمند": school.smartBoardCount,
          "تعداد پروژکتور": school.projectorCount,
          "مهارت معلمان": school.teacherITSkillLevel,
          "مهارت دانش‌آموزان": school.studentITSkillLevel,
          "برنامه آموزش IT": school.itTrainingProgram ? "دارد" : "ندارد",
          "کلاس آنلاین": school.onlineClassesCapability ? "دارد" : "ندارد",
          "پلتفرم آموزش": school.elearningPlatform ? "دارد" : "ندارد",
          "کتابخانه دیجیتال": school.digitalLibrary ? "دارد" : "ندارد",
          "آزمون آنلاین": school.onlineExamSystem ? "دارد" : "ندارد",
          نظرات: school.comments || "-",
          "آخرین بروزرسانی": school.lastUpdate
            ? new Date(school.lastUpdate).toLocaleDateString("fa-IR")
            : "-",
        }));
        fileName = "smart-school-detailed-report";
        break;

      case "improvements":
        const schoolsNeedingImprovement = smartSchools.filter(
          (s) => s.smartSchoolScore < 80
        );
        excelData = schoolsNeedingImprovement.map((school) => ({
          "کد مرکز": school.examCenterCode,
          "نام مرکز":
            examCenterNames[school.examCenterCode] || "نام مرکز یافت نشد",
          امتیاز: school.smartSchoolScore,
          "تعداد کل کلاس": school.totalClassrooms,
          "تعداد کلاس هوشمند": school.smartClassrooms,
          "درصد کلاس هوشمند":
            school.totalClassrooms > 0
              ? Math.round(
                  (school.smartClassrooms / school.totalClassrooms) * 100
                )
              : 0,
          "اولویت‌های بهبود": school.improvementPriorities.join("؛ "),
        }));
        fileName = "smart-school-improvements-report";
        break;

      case "summary":
        // برای گزارش خلاصه، آمار کلی را ایجاد می‌کنیم
        const total = smartSchools.length;
        const averageScore =
          total > 0
            ? smartSchools.reduce(
                (sum, school) => sum + school.smartSchoolScore,
                0
              ) / total
            : 0;

        excelData = [
          {
            شاخص: "تعداد کل مدارس",
            مقدار: total,
          },
          {
            شاخص: "میانگین امتیاز",
            مقدار: Math.round(averageScore * 100) / 100,
          },
          {
            شاخص: "مدارس ابتدایی (زیر 40)",
            مقدار: smartSchools.filter((s) => s.smartSchoolScore < 40).length,
          },
          {
            شاخص: "مدارس مقدماتی (40-59)",
            مقدار: smartSchools.filter(
              (s) => s.smartSchoolScore >= 40 && s.smartSchoolScore < 60
            ).length,
          },
          {
            شاخص: "مدارس متوسط (60-79)",
            مقدار: smartSchools.filter(
              (s) => s.smartSchoolScore >= 60 && s.smartSchoolScore < 80
            ).length,
          },
          {
            شاخص: "مدارس پیشرفته (80+)",
            مقدار: smartSchools.filter((s) => s.smartSchoolScore >= 80).length,
          },
          {
            شاخص: "مدارس دارای فیبر نوری",
            مقدار: smartSchools.filter(
              (s) => s.internetConnection === "فیبر نوری"
            ).length,
          },
          {
            شاخص: "مدارس دارای وای‌فای",
            مقدار: smartSchools.filter((s) => s.wifiAvailable).length,
          },
        ];
        fileName = "smart-school-summary-report";
        break;

      default:
        excelData = smartSchools.map((school) => ({
          "کد مرکز": school.examCenterCode,
          "نام مرکز":
            examCenterNames[school.examCenterCode] || "نام مرکز یافت نشد",
          امتیاز: school.smartSchoolScore,
        }));
    }

    if (excelData.length === 0) {
      return NextResponse.json(
        { success: false, error: "داده‌ای برای گزارش یافت نشد" },
        { status: 404 }
      );
    }

    // ایجاد فایل اکسل
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // تنظیم عرض ستون‌ها
    const colWidths = Object.keys(excelData[0]).map((key) => ({ wch: 20 }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "گزارش مدرسه هوشمند");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const response = new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${fileName}-${
          new Date().toISOString().split("T")[0]
        }.xlsx`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error generating Excel report:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function getSchoolLevel(score) {
  if (score >= 80) return "پیشرفته";
  if (score >= 60) return "متوسط";
  if (score >= 40) return "مقدماتی";
  return "ابتدایی";
}
