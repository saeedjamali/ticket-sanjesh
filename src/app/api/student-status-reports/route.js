import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";
import ExamCenterStats from "@/models/ExamCenterStats";
import ExamCenter from "@/models/ExamCenter";
import District from "@/models/District";
import Province from "@/models/Province";
import AcademicYear from "@/models/AcademicYear";

export async function GET(request) {
  try {
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غیر مجاز" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const course = searchParams.get("course"); // کد دوره
    const branch = searchParams.get("branch"); // کد شاخه
    const provinceId = searchParams.get("province");
    const districtId = searchParams.get("district");
    const sortBy = searchParams.get("sortBy") || "registrationPercentage"; // فیلد مرتب‌سازی
    const sortOrder = searchParams.get("sortOrder") || "desc"; // ترتیب مرتب‌سازی (asc/desc)

    console.log("📊 API Sorting Debug:", {
      sortBy,
      sortOrder,
      course,
      branch,
      url: request.url,
    });

    // Debug log
    console.log("Sorting parameters:", { sortBy, sortOrder, course, branch });

    // دریافت سال‌های تحصیلی فعال و قبلی
    const currentYear = await AcademicYear.findOne({ isActive: true });
    if (!currentYear) {
      return NextResponse.json(
        { success: false, message: "سال تحصیلی فعال یافت نشد" },
        { status: 400 }
      );
    }

    // یافتن سال قبل (فرض می‌کنیم نام سال به صورت "1403-1404" است)
    const currentYearNumber = parseInt(currentYear.name.split("-")[0]);
    const previousYearName = `${currentYearNumber - 1}-${currentYearNumber}`;

    // ساخت فیلتر برای ExamCenterStats
    let statsFilter = {};

    // فیلتر بر اساس دوره تحصیلی (با استفاده از کد دوره)
    if (course) {
      statsFilter.courseCode = course;
    }

    // فیلتر بر اساس شاخه (با استفاده از کد شاخه)
    if (branch) {
      statsFilter.branchCode = branch;
    }

    // فیلتر بر اساس نقش کاربر
    if (user.role === "provinceRegistrationExpert" && user.provinceCode) {
      statsFilter.provinceCode = user.provinceCode;
    } else if (
      user.role === "districtRegistrationExpert" &&
      user.provinceCode
    ) {
      // کاربران منطقه‌ای تمام مناطق استان را می‌بینند (برای رقابت)
      statsFilter.provinceCode = user.provinceCode;
    }

    // فیلتر بر اساس پارامترهای درخواست
    if (provinceId) {
      const province = await Province.findById(provinceId);
      if (province) {
        statsFilter.provinceCode = province.code;
      }
    }
    if (districtId) {
      const district = await District.findById(districtId);
      if (district) {
        statsFilter.districtCode = district.code;
      }
    }

    // دریافت آمار سال جاری
    const currentYearStats = await ExamCenterStats.aggregate([
      {
        $match: {
          ...statsFilter,
          academicYear: currentYear.name,
        },
      },
      {
        $group: {
          _id: "$districtCode",
          totalStudents: { $sum: "$totalStudents" },
          classifiedStudents: { $sum: "$classifiedStudents" },
          totalClasses: { $sum: "$totalClasses" },
          femaleStudents: { $sum: "$femaleStudents" },
          maleStudents: { $sum: "$maleStudents" },
          provinceCode: { $first: "$provinceCode" },
        },
      },
    ]);

    // دریافت آمار سال قبل
    const previousYearStats = await ExamCenterStats.aggregate([
      {
        $match: {
          ...statsFilter,
          academicYear: previousYearName,
        },
      },
      {
        $group: {
          _id: "$districtCode",
          totalStudents: { $sum: "$totalStudents" },
          classifiedStudents: { $sum: "$classifiedStudents" },
          totalClasses: { $sum: "$totalClasses" },
          femaleStudents: { $sum: "$femaleStudents" },
          maleStudents: { $sum: "$maleStudents" },
          provinceCode: { $first: "$provinceCode" },
        },
      },
    ]);

    // تبدیل آمار به Map برای دسترسی سریع
    const currentStatsMap = new Map();
    currentYearStats.forEach((stat) => {
      currentStatsMap.set(stat._id, stat);
    });

    const previousStatsMap = new Map();
    previousYearStats.forEach((stat) => {
      previousStatsMap.set(stat._id, stat);
    });

    // دریافت اطلاعات مناطق
    let districtFilter = {};
    if (user.role === "provinceRegistrationExpert" && user.province) {
      districtFilter.province = user.province;
    } else if (user.role === "districtRegistrationExpert" && user.province) {
      // کاربران منطقه‌ای تمام مناطق استان را می‌بینند (برای رقابت)
      districtFilter.province = user.province;
    }

    if (provinceId) {
      districtFilter.province = provinceId;
    }
    if (districtId) {
      districtFilter._id = districtId;
    }

    const districts = await District.find(districtFilter)
      .populate("province", "name code")
      .sort({ name: 1 });

    // دریافت آمار تفکیکی دوره‌ها برای سال جاری
    const currentPeriodStats = await ExamCenterStats.aggregate([
      {
        $match: {
          ...statsFilter,
          academicYear: currentYear.name,
        },
      },
      {
        $group: {
          _id: {
            districtCode: "$districtCode",
            courseCode: "$courseCode",
            courseName: "$courseName",
          },
          totalStudents: { $sum: "$totalStudents" },
          classifiedStudents: { $sum: "$classifiedStudents" },
        },
      },
    ]);

    // تبدیل آمار دوره‌ها به Map برای دسترسی سریع
    const currentPeriodStatsMap = new Map();
    currentPeriodStats.forEach((stat) => {
      const key = stat._id.districtCode;
      if (!currentPeriodStatsMap.has(key)) {
        currentPeriodStatsMap.set(key, {});
      }
      currentPeriodStatsMap.get(key)[stat._id.courseName] = {
        totalStudents: stat.totalStudents,
        classifiedStudents: stat.classifiedStudents,
      };
    });

    const districtStats = [];

    for (const district of districts) {
      const currentStats = currentStatsMap.get(district.code) || {
        totalStudents: 0,
        classifiedStudents: 0,
        totalClasses: 0,
        femaleStudents: 0,
        maleStudents: 0,
      };

      const previousStats = previousStatsMap.get(district.code) || {
        totalStudents: 0,
        classifiedStudents: 0,
        totalClasses: 0,
        femaleStudents: 0,
        maleStudents: 0,
      };

      // آمار تفکیکی دوره‌ها
      const periodBreakdown = currentPeriodStatsMap.get(district.code) || {};

      // تعداد واحدهای سازمانی (مدارس) در این منطقه با در نظر گیری فیلترهای دوره و شاخه
      const examCentersCountResult = await ExamCenterStats.aggregate([
        {
          $match: {
            ...statsFilter,
            districtCode: district.code,
            academicYear: currentYear.name,
          },
        },
        {
          $group: {
            _id: "$organizationalUnitCode",
          },
        },
        {
          $count: "totalExamCenters",
        },
      ]);

      const examCentersCount =
        examCentersCountResult.length > 0
          ? examCentersCountResult[0].totalExamCenters
          : 0;

      // console.log("🔍 currentStats:----->", currentStats);
      // console.log("🔍 previousStats:----->", previousStats);

      // محاسبه درصد ثبت‌نام (کلاس‌بندی شده نسبت به کل)
      const registrationPercentage =
        currentStats.totalStudents > 0
          ? Math.round(
              (currentStats.totalStudents / previousStats.totalStudents) * 100
            )
          : 0;

      // تعیین وضعیت رنگ بر اساس درصد
      let status = "red";
      if (registrationPercentage >= 90) status = "green";
      else if (registrationPercentage >= 75) status = "light-green";
      else if (registrationPercentage >= 25) status = "orange";

      districtStats.push({
        district: {
          _id: district._id,
          name: district.name,
          code: district.code,
          province: district.province,
        },
        currentYearStats: currentStats,
        previousYearStats: previousStats,
        registrationPercentage,
        status,
        academicYear: currentYear.name,
        previousAcademicYear: previousYearName,
        periodBreakdown,
        examCentersCount,
      });
    }

    // مرتب‌سازی بر اساس پارامتر انتخاب شده
    districtStats.sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case "registrationPercentage":
          valueA = a.registrationPercentage;
          valueB = b.registrationPercentage;
          break;
        case "currentYearStudents":
          valueA = a.currentYearStats.totalStudents;
          valueB = b.currentYearStats.totalStudents;
          break;
        case "previousYearStudents":
          valueA = a.previousYearStats.totalStudents;
          valueB = b.previousYearStats.totalStudents;
          break;
        case "classifiedStudents":
          valueA = a.currentYearStats.classifiedStudents;
          valueB = b.currentYearStats.classifiedStudents;
          break;
        case "femaleStudents":
          valueA = a.currentYearStats.femaleStudents;
          valueB = b.currentYearStats.femaleStudents;
          break;
        case "maleStudents":
          valueA = a.currentYearStats.maleStudents;
          valueB = b.currentYearStats.maleStudents;
          break;
        case "totalClasses":
          valueA = a.currentYearStats.totalClasses;
          valueB = b.currentYearStats.totalClasses;
          break;
        case "examCentersCount":
          valueA = a.examCentersCount;
          valueB = b.examCentersCount;
          break;
        case "districtName":
          valueA = a.district.name;
          valueB = b.district.name;
          break;
        case "districtCode":
          valueA = a.district.code;
          valueB = b.district.code;
          break;
        case "growthRate":
          // محاسبه نرخ رشد (درصد تغییر نسبت به سال قبل)
          const growthA =
            a.previousYearStats.totalStudents > 0
              ? ((a.currentYearStats.totalStudents -
                  a.previousYearStats.totalStudents) /
                  a.previousYearStats.totalStudents) *
                100
              : a.currentYearStats.totalStudents > 0
              ? 100
              : 0;
          const growthB =
            b.previousYearStats.totalStudents > 0
              ? ((b.currentYearStats.totalStudents -
                  b.previousYearStats.totalStudents) /
                  b.previousYearStats.totalStudents) *
                100
              : b.currentYearStats.totalStudents > 0
              ? 100
              : 0;
          valueA = growthA;
          valueB = growthB;
          break;
        default:
          valueA = a.registrationPercentage;
          valueB = b.registrationPercentage;
      }

      // اگر مقادیر رشته‌ای هستند، از localeCompare استفاده کنیم
      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortOrder === "asc"
          ? valueA.localeCompare(valueB, "fa")
          : valueB.localeCompare(valueA, "fa");
      }

      // برای مقادیر عددی
      return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
    });

    return NextResponse.json({
      success: true,
      data: districtStats,
      currentYear: currentYear.name,
      previousYear: previousYearName,
      course: course || "همه دوره‌ها",
      branch: branch || "همه شاخه‌ها",
    });
  } catch (error) {
    console.error("Error in student-status-reports:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت گزارش وضعیت دانش‌آموزی" },
      { status: 500 }
    );
  }
}
