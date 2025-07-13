import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";
import ExamCenterStats from "@/models/ExamCenterStats";
import District from "@/models/District";
import Province from "@/models/Province";
import AcademicYear from "@/models/AcademicYear";
import * as XLSX from "xlsx";

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
    const course = searchParams.get("course");
    const branch = searchParams.get("branch");
    const provinceId = searchParams.get("province");
    const districtId = searchParams.get("district");

    // دریافت سال‌های تحصیلی
    const currentYear = await AcademicYear.findOne({ isActive: true });
    if (!currentYear) {
      return NextResponse.json(
        { success: false, message: "سال تحصیلی فعال یافت نشد" },
        { status: 400 }
      );
    }

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
      user.districtCode
    ) {
      statsFilter.districtCode = user.districtCode;
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
    } else if (user.role === "districtRegistrationExpert" && user.district) {
      districtFilter._id = user.district;
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

    // آماده‌سازی داده‌ها برای Excel
    const excelData = [];
    
    // افزودن هدرها
    excelData.push([
      "کد منطقه",
      "نام منطقه", 
      "کد استان",
      "نام استان",
      "کل دانش‌آموزان سال جاری",
      "کلاس‌بندی شده سال جاری",
      "کل دانش‌آموزان سال قبل",
      "کلاس‌بندی شده سال قبل",
      "درصد ثبت‌نام",
      "وضعیت",
      "دختر سال جاری",
      "پسر سال جاری",
      "تعداد کلاس‌ها"
    ]);

    // افزودن داده‌ها
    let totalCurrentStudents = 0;
    let totalCurrentClassified = 0;
    let totalPreviousStudents = 0;
    let totalPreviousClassified = 0;
    let totalCurrentFemale = 0;
    let totalCurrentMale = 0;
    let totalClasses = 0;

    districts.forEach((district) => {
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

      const registrationPercentage =
        currentStats.totalStudents > 0
          ? Math.round(
              (currentStats.classifiedStudents / currentStats.totalStudents) *
                100
            )
          : 0;

      let status = "ضعیف";
      if (registrationPercentage >= 90) {
        status = "عالی";
      } else if (registrationPercentage >= 75) {
        status = "خوب";
      } else if (registrationPercentage >= 25) {
        status = "متوسط";
      }

      // محاسبه مجموع کل
      totalCurrentStudents += currentStats.totalStudents;
      totalCurrentClassified += currentStats.classifiedStudents;
      totalPreviousStudents += previousStats.totalStudents;
      totalPreviousClassified += previousStats.classifiedStudents;
      totalCurrentFemale += currentStats.femaleStudents;
      totalCurrentMale += currentStats.maleStudents;
      totalClasses += currentStats.totalClasses;

      excelData.push([
        district.code,
        district.name,
        district.province.code,
        district.province.name,
        currentStats.totalStudents,
        currentStats.classifiedStudents,
        previousStats.totalStudents,
        previousStats.classifiedStudents,
        `${registrationPercentage}%`,
        status,
        currentStats.femaleStudents,
        currentStats.maleStudents,
        currentStats.totalClasses,
      ]);
    });

    // افزودن ردیف مجموع کل
    const totalRegistrationPercentage = totalCurrentStudents > 0 
      ? Math.round((totalCurrentClassified / totalCurrentStudents) * 100)
      : 0;

    excelData.push([
      "",
      "مجموع کل",
      "",
      "",
      totalCurrentStudents,
      totalCurrentClassified,
      totalPreviousStudents,
      totalPreviousClassified,
      `${totalRegistrationPercentage}%`,
      "",
      totalCurrentFemale,
      totalCurrentMale,
      totalClasses,
    ]);

    // ایجاد workbook و worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // تنظیم عرض ستون‌ها
    const columnWidths = [
      { wch: 15 }, // کد منطقه
      { wch: 25 }, // نام منطقه
      { wch: 15 }, // کد استان
      { wch: 20 }, // نام استان
      { wch: 20 }, // کل دانش‌آموزان سال جاری
      { wch: 20 }, // کلاس‌بندی شده سال جاری
      { wch: 20 }, // کل دانش‌آموزان سال قبل
      { wch: 20 }, // کلاس‌بندی شده سال قبل
      { wch: 15 }, // درصد ثبت‌نام
      { wch: 15 }, // وضعیت
      { wch: 15 }, // دختر سال جاری
      { wch: 15 }, // پسر سال جاری
      { wch: 15 }, // تعداد کلاس‌ها
    ];

    worksheet["!cols"] = columnWidths;

    // اضافه کردن worksheet به workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش وضعیت دانش‌آموزی");

    // تولید فایل Excel
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // تنظیم header برای دانلود
    const filename = `student-status-report-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error in export:", error);
    return NextResponse.json(
      { success: false, message: "خطا در تولید فایل Excel" },
      { status: 500 }
    );
  }
}
