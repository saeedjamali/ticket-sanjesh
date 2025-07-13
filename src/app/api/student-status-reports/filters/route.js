import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";

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
    const courseCode = searchParams.get("course");

    // دریافت همه دوره‌های فعال
    const courses = await CourseGrade.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: "$courseCode",
          courseName: { $first: "$courseName" },
          courseCode: { $first: "$courseCode" },
        },
      },
      {
        $sort: { courseCode: 1 },
      },
    ]);

    // دریافت شاخه‌های فعال (با فیلتر بر اساس دوره در صورت وجود)
    let branchFilter = { isActive: true };
    if (courseCode) {
      branchFilter.courseCode = courseCode;
    }

    const branches = await CourseBranchField.aggregate([
      {
        $match: branchFilter,
      },
      {
        $group: {
          _id: "$branchCode",
          branchTitle: { $first: "$branchTitle" },
          branchCode: { $first: "$branchCode" },
        },
      },
      {
        $sort: { branchCode: 1 },
      },
    ]);

    // تبدیل دوره‌ها به فرمت مناسب dropdown
    const courseOptions = [
      { value: "", label: "همه دوره‌ها" },
      ...courses.map((course) => ({
        value: course.courseCode,
        label: course.courseName,
      })),
    ];

    // تبدیل شاخه‌ها به فرمت مناسب dropdown
    const branchOptions = [
      { value: "", label: "همه شاخه‌ها" },
      ...branches.map((branch) => ({
        value: branch.branchCode,
        label: branch.branchTitle,
      })),
    ];

    return NextResponse.json({
      success: true,
      data: {
        courses: courseOptions,
        branches: branchOptions,
      },
    });
  } catch (error) {
    console.error("Error in student-status-reports filters:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت فیلترها" },
      { status: 500 }
    );
  }
}
