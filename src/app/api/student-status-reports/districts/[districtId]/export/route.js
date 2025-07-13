import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";
import ExamCenterStats from "@/models/ExamCenterStats";
import District from "@/models/District";
import AcademicYear from "@/models/AcademicYear";
import ExamCenter from "@/models/ExamCenter";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import * as XLSX from "xlsx";

export async function GET(request, { params }) {
  try {
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غیر مجاز" },
        { status: 401 }
      );
    }

    await connectDB();

    const { districtId } = params;
    const { searchParams } = new URL(request.url);
    const course = searchParams.get("course");
    const branch = searchParams.get("branch");

    // بررسی دسترسی
    if (
      user.role === "districtRegistrationExpert" &&
      user.district.toString() !== districtId
    ) {
      return NextResponse.json(
        { success: false, message: "دسترسی محدود به منطقه خودتان" },
        { status: 403 }
      );
    }

    if (user.role === "provinceRegistrationExpert") {
      const district = await District.findById(districtId);
      if (
        !district ||
        district.province.toString() !== user.province.toString()
      ) {
        return NextResponse.json(
          { success: false, message: "دسترسی محدود به استان خودتان" },
          { status: 403 }
        );
      }
    }

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

    // دریافت اطلاعات منطقه
    const district = await District.findById(districtId).populate(
      "province",
      "name code"
    );
    if (!district) {
      return NextResponse.json(
        { success: false, message: "منطقه یافت نشد" },
        { status: 404 }
      );
    }

    // ساخت فیلتر برای ExamCenter
    let examCenterFilter = { district: districtId };

    // فیلتر بر اساس دوره تحصیلی
    if (course) {
      // پیدا کردن CourseGrade با courseCode
      const courseGrade = await CourseGrade.findOne({ courseCode: course });
      if (courseGrade) {
        examCenterFilter.course = courseGrade._id;
      }
    }

    // فیلتر بر اساس شاخه
    if (branch) {
      // پیدا کردن CourseBranchField با branchCode
      const courseBranch = await CourseBranchField.findOne({
        branchCode: branch,
      });
      if (courseBranch) {
        examCenterFilter.branch = courseBranch._id;
      }
    }

    const examCenters = await ExamCenter.find(examCenterFilter)
      .populate("course", "courseName courseCode")
      .populate("branch", "branchTitle branchCode")
      .populate("gender", "genderTitle")
      .sort({
        name: 1,
      });

    // آماده‌سازی داده‌ها برای Excel
    const excelData = [];

    // افزودن اطلاعات منطقه در بالا
    excelData.push([`گزارش مدارس منطقه: ${district.name}`]);
    excelData.push([`کد منطقه: ${district.code}`]);
    excelData.push([`استان: ${district.province.name}`]);
    excelData.push([
      `تاریخ تولید گزارش: ${new Date().toLocaleDateString("fa-IR")}`,
    ]);
    excelData.push([]); // ردیف خالی

    // افزودن هدرها
    excelData.push([
      "نام مدرسه",
      "کد مدرسه",
      "دوره تحصیلی",
      "جنسیت",
      "شاخه",
      `دانش‌آموزان ${currentYear.name}`,
      `دانش‌آموزان ${previousYearName}`,
      "درصد تغییر",
      "کلاس‌بندی شده",
      "دختر",
      "پسر",
      "تعداد کلاس‌ها",
    ]);

    // پردازش داده‌ها
    let totalCurrentYear = 0;
    let totalPreviousYear = 0;
    let totalClassified = 0;
    let totalFemale = 0;
    let totalMale = 0;
    let totalClasses = 0;

    for (const examCenter of examCenters) {
      // ساخت فیلتر برای ExamCenterStats
      let statsFilter = {
        organizationalUnitCode: examCenter.code,
      };

      // فیلتر بر اساس دوره تحصیلی (با استفاده از کد دوره)
      if (course) {
        statsFilter.courseCode = course;
      }

      // فیلتر بر اساس شاخه (با استفاده از کد شاخه)
      if (branch) {
        statsFilter.branchCode = branch;
      }

      // آمار سال جاری
      const currentYearStat = await ExamCenterStats.findOne({
        ...statsFilter,
        academicYear: currentYear.name,
      });

      // آمار سال قبل
      const previousYearStat = await ExamCenterStats.findOne({
        ...statsFilter,
        academicYear: previousYearName,
      });

      const currentTotal = currentYearStat?.totalStudents || 0;
      const previousTotal = previousYearStat?.totalStudents || 0;
      const classified = currentYearStat?.classifiedStudents || 0;
      const female = currentYearStat?.femaleStudents || 0;
      const male = currentYearStat?.maleStudents || 0;
      const classes = currentYearStat?.totalClasses || 0;

      const registrationPercentage =
        previousTotal > 0
          ? Math.round((currentTotal / previousTotal) * 100)
          : currentTotal > 0
          ? 100
          : 0;

      // محاسبه مجموع کل
      totalCurrentYear += currentTotal;
      totalPreviousYear += previousTotal;
      totalClassified += classified;
      totalFemale += female;
      totalMale += male;
      totalClasses += classes;

      excelData.push([
        examCenter.name,
        examCenter.code,
        examCenter.course?.courseName || "نامشخص",
        examCenter.gender?.genderTitle || "نامشخص",
        examCenter.branch?.branchTitle || "نامشخص",
        currentTotal,
        previousTotal,
        registrationPercentage,
        classified,
        female,
        male,
        classes,
      ]);
    }

    // اضافه کردن جمع کل در انتها
    excelData.push([
      "جمع کل",
      "",
      "",
      "",
      "",
      totalCurrentYear,
      totalPreviousYear,
      "",
      totalClassified,
      totalFemale,
      totalMale,
      totalClasses,
    ]);

    // ایجاد workbook و worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // تنظیم عرض ستون‌ها
    const columnWidths = [
      { wch: 30 }, // نام مدرسه
      { wch: 15 }, // کد مدرسه
      { wch: 20 }, // دوره تحصیلی
      { wch: 15 }, // جنسیت
      { wch: 15 }, // نوع مدرسه
      { wch: 20 }, // دانش‌آموزان سال جاری
      { wch: 20 }, // دانش‌آموزان سال قبل
      { wch: 15 }, // درصد تغییر
      { wch: 18 }, // کلاس‌بندی شده
      { wch: 15 }, // دختر
      { wch: 15 }, // پسر
      { wch: 15 }, // تعداد کلاس‌ها
    ];

    worksheet["!cols"] = columnWidths;

    // اضافه کردن worksheet به workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, `مدارس ${district.name}`);

    // تولید فایل Excel
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const filename = `district-schools-report-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`,
      },
    });
  } catch (error) {
    console.error("Error generating district Excel report:", error);
    return NextResponse.json(
      { success: false, message: "خطا در تولید گزارش اکسل" },
      { status: 500 }
    );
  }
}
