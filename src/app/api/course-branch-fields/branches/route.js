import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import CourseBranchField from "@/models/CourseBranchField";
import CourseGrade from "@/models/CourseGrade";

// GET - دریافت شاخه‌ها براساس دوره
export async function GET(request) {
  try {
    // احراز هویت
    const cookieStore = await cookies();
    const authToken = cookieStore?.get("refresh-token");
    const { user } = await authService.refreshToken(authToken?.value);

    if (!user) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course");

    if (!courseId) {
      return NextResponse.json(
        { error: "شناسه دوره الزامی است" },
        { status: 400 }
      );
    }

    // دریافت دوره
    const course = await CourseGrade.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: "دوره یافت نشد" }, { status: 404 });
    }

    // دریافت شاخه‌های مربوط به این دوره
    const courseBranchFields = await CourseBranchField.find({
      courseCode: course.courseCode,
      isActive: true,
    })
      .select("_id branchCode branchTitle")
      .lean();

    console.log(
      `Found ${courseBranchFields.length} course branch fields for course ${course.courseCode}`
    );

    // تبدیل به فرمت منحصر به فرد شاخه‌ها
    const uniqueBranches = {};
    courseBranchFields.forEach((item) => {
      if (!uniqueBranches[item.branchCode]) {
        uniqueBranches[item.branchCode] = {
          _id: item._id,
          branchCode: item.branchCode,
          branchTitle: item.branchTitle,
        };
      }
    });

    const branches = Object.values(uniqueBranches);

    return NextResponse.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error("خطا در دریافت شاخه‌ها:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات" },
      { status: 500 }
    );
  }
}
