import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";
import ExamCenterStats from "@/models/ExamCenterStats";
import District from "@/models/District";
import AcademicYear from "@/models/AcademicYear";
import ExamCenter from "@/models/ExamCenter";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";

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
    const sortBy = searchParams.get("sortBy") || "registrationPercentage"; // فیلد مرتب‌سازی
    const sortOrder = searchParams.get("sortOrder") || "desc"; // ترتیب مرتب‌سازی (asc/desc)

    console.log("📊 District API Sorting Debug:", {
      sortBy,
      sortOrder,
      course,
      branch,
      districtId,
      url: request.url,
    });

    // بررسی دسترسی کاربر به منطقه
    if (user.role === "provinceRegistrationExpert" && user.province) {
      const district = await District.findById(districtId).populate("province");
      if (!district || district.province._id.toString() !== user.province) {
        return NextResponse.json(
          { success: false, message: "دسترسی به این منطقه ندارید" },
          { status: 403 }
        );
      }
    } else if (user.role === "districtRegistrationExpert" && user.district) {
      if (districtId !== user.district.toString()) {
        return NextResponse.json(
          { success: false, message: "دسترسی به این منطقه ندارید" },
          { status: 403 }
        );
      }
    }

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

    // دریافت سال‌های تحصیلی فعال و قبلی
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
    let statsFilter = {
      districtCode: district.code,
    };

    // فیلتر بر اساس دوره تحصیلی (با استفاده از کد دوره)
    if (course) {
      statsFilter.courseCode = course;
    }

    // فیلتر بر اساس شاخه (با استفاده از کد شاخه)
    if (branch) {
      statsFilter.branchCode = branch;
    }

    // دریافت آمار سال جاری به تفکیک واحد سازمانی
    const currentYearStats = await ExamCenterStats.aggregate([
      {
        $match: {
          ...statsFilter,
          academicYear: currentYear.name,
        },
      },
      {
        $group: {
          _id: "$organizationalUnitCode",
          totalStudents: { $sum: "$totalStudents" },
          classifiedStudents: { $sum: "$classifiedStudents" },
          totalClasses: { $sum: "$totalClasses" },
          femaleStudents: { $sum: "$femaleStudents" },
          maleStudents: { $sum: "$maleStudents" },
          courses: {
            $push: {
              courseCode: "$courseCode",
              courseName: "$courseName",
              branchCode: "$branchCode",
              branchTitle: "$branchTitle",
              totalStudents: "$totalStudents",
              classifiedStudents: "$classifiedStudents",
            },
          },
        },
      },
    ]);

    // دریافت آمار سال قبل به تفکیک واحد سازمانی
    const previousYearStats = await ExamCenterStats.aggregate([
      {
        $match: {
          ...statsFilter,
          academicYear: previousYearName,
        },
      },
      {
        $group: {
          _id: "$organizationalUnitCode",
          totalStudents: { $sum: "$totalStudents" },
          classifiedStudents: { $sum: "$classifiedStudents" },
          totalClasses: { $sum: "$totalClasses" },
          femaleStudents: { $sum: "$femaleStudents" },
          maleStudents: { $sum: "$maleStudents" },
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

    // دریافت اطلاعات واحدهای سازمانی منطقه با فیلتر
    const examCenters = await ExamCenter.find(examCenterFilter)
      .populate("course", "courseName courseCode")
      .populate("branch", "branchTitle branchCode")
      .populate("gender", "genderTitle")
      .sort({
        name: 1,
      });

    const schoolsData = [];

    for (const examCenter of examCenters) {
      const currentStats = currentStatsMap.get(examCenter.code) || {
        totalStudents: 0,
        classifiedStudents: 0,
        totalClasses: 0,
        femaleStudents: 0,
        maleStudents: 0,
        courses: [],
      };

      const previousStats = previousStatsMap.get(examCenter.code) || {
        totalStudents: 0,
        classifiedStudents: 0,
        totalClasses: 0,
        femaleStudents: 0,
        maleStudents: 0,
      };

      // محاسبه درصد ثبت‌نام (کلاس‌بندی شده نسبت به کل)
      const registrationPercentage =
        currentStats.totalStudents > 0
          ? Math.round(
              (currentStats.classifiedStudents / currentStats.totalStudents) *
                100
            )
          : 0;

      // تعیین وضعیت رنگ بر اساس درصد
      let status = "red";
      if (registrationPercentage >= 90) status = "green";
      else if (registrationPercentage >= 75) status = "light-green";
      else if (registrationPercentage >= 25) status = "orange";

      schoolsData.push({
        examCenter: {
          _id: examCenter._id,
          code: examCenter.code,
          name: examCenter.name,
          address: examCenter.address,
          phone: examCenter.phone,
          course: examCenter.course?.courseName || "نامشخص",
          gender: examCenter.gender?.genderTitle || "نامشخص",
        },
        currentYearStats: currentStats,
        previousYearStats: previousStats,
        registrationPercentage,
        status,
        academicYear: currentYear.name,
        previousAcademicYear: previousYearName,
      });
    }

    // مرتب‌سازی بر اساس پارامتر انتخاب شده
    schoolsData.sort((a, b) => {
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
        case "schoolName":
          valueA = a.examCenter.name;
          valueB = b.examCenter.name;
          break;
        case "schoolCode":
          valueA = a.examCenter.code;
          valueB = b.examCenter.code;
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

    // محاسبه آمار کلی منطقه
    const totalCurrentStats = {
      totalStudents: schoolsData.reduce(
        (sum, school) => sum + school.currentYearStats.totalStudents,
        0
      ),
      classifiedStudents: schoolsData.reduce(
        (sum, school) => sum + school.currentYearStats.classifiedStudents,
        0
      ),
      totalClasses: schoolsData.reduce(
        (sum, school) => sum + school.currentYearStats.totalClasses,
        0
      ),
      femaleStudents: schoolsData.reduce(
        (sum, school) => sum + school.currentYearStats.femaleStudents,
        0
      ),
      maleStudents: schoolsData.reduce(
        (sum, school) => sum + school.currentYearStats.maleStudents,
        0
      ),
    };

    const totalPreviousStats = {
      totalStudents: schoolsData.reduce(
        (sum, school) => sum + school.previousYearStats.totalStudents,
        0
      ),
      classifiedStudents: schoolsData.reduce(
        (sum, school) => sum + school.previousYearStats.classifiedStudents,
        0
      ),
      totalClasses: schoolsData.reduce(
        (sum, school) => sum + school.previousYearStats.totalClasses,
        0
      ),
      femaleStudents: schoolsData.reduce(
        (sum, school) => sum + school.previousYearStats.femaleStudents,
        0
      ),
      maleStudents: schoolsData.reduce(
        (sum, school) => sum + school.previousYearStats.maleStudents,
        0
      ),
    };

    const overallRegistrationPercentage =
      totalCurrentStats.totalStudents > 0
        ? Math.round(
            (totalCurrentStats.classifiedStudents /
              totalCurrentStats.totalStudents) *
              100
          )
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        district: {
          _id: district._id,
          name: district.name,
          code: district.code,
          province: district.province,
        },
        schools: schoolsData,
        summary: {
          totalSchools: schoolsData.length,
          currentYearStats: totalCurrentStats,
          previousYearStats: totalPreviousStats,
          overallRegistrationPercentage,
          academicYear: currentYear.name,
          previousAcademicYear: previousYearName,
        },
        currentYear: currentYear.name,
        previousYear: previousYearName,
        course: course || "همه دوره‌ها",
        branch: branch || "همه شاخه‌ها",
      },
    });
  } catch (error) {
    console.error("Error in district details:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت جزئیات منطقه" },
      { status: 500 }
    );
  }
}
